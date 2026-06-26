use odra::prelude::*;

/// One recorded agent decision attestation. Append-only, stored on-chain.
#[odra::odra_type]
pub struct Record {
    /// hex(sha256(exact IPFS-pinned bytes)) — the integrity anchor (64 hex chars).
    pub decision_hash: String,
    /// IPFS CID of the full reasoning + observed-state payload.
    pub ipfs_cid: String,
    /// Action kind, e.g. "delegate" / "redelegate" / "hold".
    pub action_kind: String,
    /// The agent cycle/epoch this decision was made in.
    pub epoch: u64,
    /// Who recorded it (always the authorized agent).
    pub recorder: Address,
    /// Block time (ms) when recorded.
    pub timestamp: u64,
}

/// Emitted on every successful `record`.
#[odra::event]
pub struct Recorded {
    pub index: u64,
    pub decision_hash: String,
    pub ipfs_cid: String,
    pub action_kind: String,
    pub epoch: u64,
}

/// Journal errors.
#[odra::odra_error]
pub enum Error {
    /// Caller is not the authorized agent.
    NotAuthorized = 1,
}

/// The Steward decision journal: agent-only append, public reads.
///
/// The deployer (the Steward agent key) becomes the sole authorized recorder.
/// Anyone can read `count` and `get_record`. Each record is the on-chain
/// attestation of *why* a treasury action was taken (BUILD-PROMPT §3).
#[odra::module(events = [Recorded])]
pub struct Journal {
    /// The only address allowed to record (set to the deployer at init).
    agent: Var<Address>,
    /// Number of records written.
    count: Var<u64>,
    /// index -> Record (append-only).
    records: Mapping<u64, Record>,
}

#[odra::module]
impl Journal {
    /// Initialize: the deployer (the Steward agent) becomes the sole recorder.
    /// No external arg — the agent is provably whoever deployed the contract.
    pub fn init(&mut self) {
        self.agent.set(self.env().caller());
        self.count.set(0);
    }

    /// Record a decision attestation. Reverts with `NotAuthorized` unless the
    /// caller is the agent. Returns the new record index.
    pub fn record(
        &mut self,
        decision_hash: String,
        ipfs_cid: String,
        action_kind: String,
        epoch: u64,
    ) -> u64 {
        let caller = self.env().caller();
        if self.agent.get() != Some(caller) {
            self.env().revert(Error::NotAuthorized);
        }
        let index = self.count.get_or_default();
        self.records.set(
            &index,
            Record {
                decision_hash: decision_hash.clone(),
                ipfs_cid: ipfs_cid.clone(),
                action_kind: action_kind.clone(),
                epoch,
                recorder: caller,
                timestamp: self.env().get_block_time(),
            },
        );
        self.count.set(index + 1);
        self.env().emit_event(Recorded {
            index,
            decision_hash,
            ipfs_cid,
            action_kind,
            epoch,
        });
        index
    }

    /// Total number of records.
    pub fn count(&self) -> u64 {
        self.count.get_or_default()
    }

    /// Get a record by index (None if out of range).
    pub fn get_record(&self, index: u64) -> Option<Record> {
        self.records.get(&index)
    }

    /// The authorized agent address.
    pub fn agent(&self) -> Option<Address> {
        self.agent.get()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, NoArgs};

    #[test]
    fn records_and_reads() {
        let env = odra_test::env();
        let agent = env.get_account(0); // default caller == deployer == agent
        let mut journal = Journal::deploy(&env, NoArgs);

        assert_eq!(journal.count(), 0);
        assert_eq!(journal.agent(), Some(agent));

        let idx = journal.record(
            "a".repeat(64),
            "bafyTestCid".to_string(),
            "delegate".to_string(),
            7,
        );
        assert_eq!(idx, 0);
        assert_eq!(journal.count(), 1);

        let rec = journal.get_record(0).unwrap();
        assert_eq!(rec.ipfs_cid, "bafyTestCid");
        assert_eq!(rec.action_kind, "delegate");
        assert_eq!(rec.epoch, 7);
        assert_eq!(rec.recorder, agent);
    }

    #[test]
    fn non_agent_cannot_record() {
        let env = odra_test::env();
        let attacker = env.get_account(1);
        let mut journal = Journal::deploy(&env, NoArgs);

        env.set_caller(attacker);
        let result = journal.try_record(
            "b".repeat(64),
            "cid".to_string(),
            "delegate".to_string(),
            1,
        );
        assert_eq!(result, Err(Error::NotAuthorized.into()));
        assert_eq!(journal.count(), 0);
    }
}
