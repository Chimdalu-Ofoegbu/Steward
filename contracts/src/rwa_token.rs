use odra::casper_types::U256;
use odra::prelude::*;

/// Errors for the mock RWA token.
#[odra::odra_error]
pub enum Error {
    /// Caller is not the token owner (the Steward agent).
    NotOwner = 1,
    /// Transfer amount exceeds the sender's balance.
    InsufficientBalance = 2,
}

/// Emitted on mint / transfer so the movement is observable on-chain.
#[odra::event]
pub struct Transfer {
    pub from: Option<Address>,
    pub to: Option<Address>,
    pub amount: U256,
}

/// A minimal CEP-18-style **mock** RWA stablecoin ("rwUSD") that the Steward agent
/// self-custodies to represent tokenized real-world-asset exposure on Casper testnet.
/// The deployer (the agent) is the owner/minter; anyone can read balances.
///
/// This is a MOCK for the buildathon — it makes the agent's RWA allocation *real*
/// on-chain rather than a schema field. A compliant, permissioned ERC-3643-style
/// token is the documented mainnet path (see docs/LAUNCH.md).
#[odra::module(events = [Transfer])]
pub struct RwaToken {
    owner: Var<Address>,
    name: Var<String>,
    symbol: Var<String>,
    decimals: Var<u8>,
    total_supply: Var<U256>,
    balances: Mapping<Address, U256>,
}

#[odra::module]
impl RwaToken {
    /// Deploy-time init: set metadata, owner = deployer (agent), mint `initial_supply` to the owner.
    pub fn init(&mut self, name: String, symbol: String, decimals: u8, initial_supply: U256) {
        let caller = self.env().caller();
        self.owner.set(caller);
        self.name.set(name);
        self.symbol.set(symbol);
        self.decimals.set(decimals);
        self.total_supply.set(initial_supply);
        self.balances.set(&caller, initial_supply);
        self.env().emit_event(Transfer { from: None, to: Some(caller), amount: initial_supply });
    }

    // ── CEP-18 reads ────────────────────────────────────────────────────────────
    pub fn name(&self) -> String {
        self.name.get_or_default()
    }
    pub fn symbol(&self) -> String {
        self.symbol.get_or_default()
    }
    pub fn decimals(&self) -> u8 {
        self.decimals.get_or_default()
    }
    pub fn total_supply(&self) -> U256 {
        self.total_supply.get_or_default()
    }
    pub fn balance_of(&self, address: Address) -> U256 {
        self.balances.get(&address).unwrap_or_default()
    }
    pub fn owner(&self) -> Option<Address> {
        self.owner.get()
    }

    // ── Writes ──────────────────────────────────────────────────────────────────
    /// Owner-only mint — the agent "allocates" into RWA by minting rwUSD to a holder.
    pub fn mint(&mut self, to: Address, amount: U256) {
        self.assert_owner();
        let bal = self.balances.get(&to).unwrap_or_default();
        self.balances.set(&to, bal + amount);
        self.total_supply.set(self.total_supply.get_or_default() + amount);
        self.env().emit_event(Transfer { from: None, to: Some(to), amount });
    }

    /// Standard transfer of rwUSD.
    pub fn transfer(&mut self, recipient: Address, amount: U256) {
        let sender = self.env().caller();
        let from_bal = self.balances.get(&sender).unwrap_or_default();
        if from_bal < amount {
            self.env().revert(Error::InsufficientBalance);
        }
        self.balances.set(&sender, from_bal - amount);
        let to_bal = self.balances.get(&recipient).unwrap_or_default();
        self.balances.set(&recipient, to_bal + amount);
        self.env().emit_event(Transfer { from: Some(sender), to: Some(recipient), amount });
    }

    fn assert_owner(&self) {
        if self.owner.get() != Some(self.env().caller()) {
            self.env().revert(Error::NotOwner);
        }
    }
}
