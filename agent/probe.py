"""Phase-1 acceptance probe (TOOL-02/03): read balance -> transfer -> confirm -> explorer link.

Run AFTER the agent key is funded from the testnet faucet:
    agent/.venv/Scripts/python.exe agent/probe.py

Note: Casper rejects a transfer to your own account (source purse == target purse ->
"Invalid purse"), so this transfers to a fresh ephemeral target (auto-created by the
transfer). It proves the full build->sign->submit->execute->confirm write path that
Phase 4 staking reuses. Exits 2 if unfunded, 1 if the transfer failed, 0 on success.
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from steward import chain  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((REPO / "deployments" / "testnet.json").read_text())
PUB = MANIFEST["agent"]["public_key_hex"]
EXPLORER = MANIFEST["explorer"]
FAUCET = "https://testnet.cspr.live/tools/faucet"
TRANSFER_MOTES = 2_500_000_000  # 2.5 CSPR
SIDECAR = str(REPO / "agent" / "sidecar" / "chain.mjs")


def ephemeral_target() -> str:
    """Generate a throwaway target key (the transfer recipient auto-creates the account)."""
    d = os.path.join(tempfile.gettempdir(), "steward-probe-target")
    out = subprocess.run([
        "node", SIDECAR, "keygen", d,
    ], capture_output=True, text=True, cwd=str(REPO))
    out.check_returncode()
    return json.loads(out.stdout.strip().splitlines()[-1])["public_key_hex"]


def main() -> int:
    print(f"Agent public key : {PUB}")
    print(f"Network          : {chain.NETWORK}  via  {chain.RPC}")

    bal = chain.get_balance(PUB)
    print(f"Balance          : {bal} motes ({bal / 1e9:.4f} CSPR)")
    if bal <= 0:
        print(f"\n[NOT FUNDED] Fund this key at {FAUCET}, then re-run.")
        return 2

    target = ephemeral_target()
    print(f"\nTransfer target  : {target} (fresh; auto-created by the transfer)")
    print(f"Submitting transfer of {TRANSFER_MOTES} motes (2.5 CSPR)...")
    txh = chain.transfer(target, TRANSFER_MOTES)
    print(f"transaction_hash : {txh}")
    print(f"Explorer (txn)   : {EXPLORER}/transaction/{txh}")

    print("Confirming (polling execution)...")
    ok = chain.confirm(txh, timeout_s=240)
    print(f"Execution success: {ok}")
    if ok:
        got = chain.get_balance(target)
        print(f"Target balance   : {got} motes (expected {TRANSFER_MOTES})")
    print(f"Explorer (agent) : {EXPLORER}/account/{PUB}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
