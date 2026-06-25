"""Phase-1 acceptance probe (TOOL-02/03): read balance -> self-transfer -> confirm -> explorer link.

Run AFTER the agent key is funded from the testnet faucet:
    agent/.venv/Scripts/python.exe agent/probe.py
Exits 2 if unfunded, 1 if the transfer failed to execute, 0 on success.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from steward import chain  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((REPO / "deployments" / "testnet.json").read_text())
PUB = MANIFEST["agent"]["public_key_hex"]
EXPLORER = MANIFEST["explorer"]
FAUCET = "https://testnet.cspr.live/tools/faucet"
SELF_TRANSFER_MOTES = 2_500_000_000  # 2.5 CSPR


def main() -> int:
    print(f"Agent public key : {PUB}")
    print(f"Network          : {chain.NETWORK}  via  {chain.RPC}")

    bal = chain.get_balance(PUB)
    print(f"Balance          : {bal} motes ({bal / 1e9:.4f} CSPR)")
    if bal <= 0:
        print(f"\n[NOT FUNDED] Fund this key at {FAUCET} (Casper Wallet, once per account), then re-run.")
        return 2

    print(f"\nSubmitting self-transfer of {SELF_TRANSFER_MOTES} motes (2.5 CSPR)...")
    txh = chain.transfer(PUB, SELF_TRANSFER_MOTES)
    print(f"transaction_hash : {txh}")
    print(f"Explorer (txn)   : {EXPLORER}/transaction/{txh}")

    print("Confirming (polling execution)...")
    ok = chain.confirm(txh, timeout_s=240)
    print(f"Execution success: {ok}")
    print(f"Explorer (account): {EXPLORER}/account/{PUB}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
