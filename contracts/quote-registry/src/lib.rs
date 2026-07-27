#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env,
    String,
};

const INSTANCE_BUMP_LEDGERS: u32 = 30 * 17_280;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_LEDGERS - 17_280;
const QUOTE_BUMP_LEDGERS: u32 = 90 * 17_280;
const QUOTE_LIFETIME_THRESHOLD: u32 = QUOTE_BUMP_LEDGERS - 17_280;

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum QuoteStatus {
    Open,
    Paid,
    Cancelled,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Quote {
    pub merchant: Address,
    pub payer: Address,
    pub amount_minor: i128,
    pub currency: String,
    pub expires_ledger: u32,
    pub status: QuoteStatus,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct FxRate {
    pub numerator: i128,
    pub denominator: i128,
    pub valid_until: u32,
}

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Quote(BytesN<32>),
    Rate(String),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracterror]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    QuoteExists = 3,
    QuoteNotFound = 4,
    RateNotFound = 5,
    InvalidAmount = 6,
    InvalidExpiry = 7,
    InvalidRate = 8,
    InvalidStatus = 9,
    QuoteExpired = 10,
}

#[contract]
pub struct QuoteRegistryContract;

#[contractevent(data_format = "single-value")]
pub struct QuoteRegistryInitialized {
    pub admin: Address,
}

#[contractevent(data_format = "single-value")]
pub struct QuoteCreated {
    pub quote_id: BytesN<32>,
}

#[contractevent(data_format = "single-value")]
pub struct QuotePaid {
    pub quote_id: BytesN<32>,
}

#[contractevent(data_format = "map")]
pub struct RatePublished {
    pub pair: String,
    pub numerator: i128,
    pub denominator: i128,
}

#[contractimpl]
impl QuoteRegistryContract {
    pub fn initialize(e: Env, admin: Address) -> Result<(), Error> {
        if e.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_LEDGERS);
        QuoteRegistryInitialized { admin }.publish(&e);
        Ok(())
    }

    pub fn publish_rate(
        e: Env,
        pair: String,
        numerator: i128,
        denominator: i128,
        valid_until: u32,
    ) -> Result<(), Error> {
        let admin = Self::read_admin(&e)?;
        admin.require_auth();
        if numerator <= 0 || denominator <= 0 {
            return Err(Error::InvalidRate);
        }
        if valid_until <= e.ledger().sequence() {
            return Err(Error::InvalidExpiry);
        }
        let key = DataKey::Rate(pair.clone());
        e.storage().persistent().set(
            &key,
            &FxRate {
                numerator,
                denominator,
                valid_until,
            },
        );
        e.storage()
            .persistent()
            .extend_ttl(&key, QUOTE_LIFETIME_THRESHOLD, QUOTE_BUMP_LEDGERS);
        RatePublished {
            pair,
            numerator,
            denominator,
        }
        .publish(&e);
        Ok(())
    }

    pub fn get_rate(e: Env, pair: String) -> Result<FxRate, Error> {
        e.storage()
            .persistent()
            .get(&DataKey::Rate(pair))
            .ok_or(Error::RateNotFound)
    }

    pub fn create_quote(
        e: Env,
        quote_id: BytesN<32>,
        merchant: Address,
        payer: Address,
        amount_minor: i128,
        currency: String,
        expires_ledger: u32,
    ) -> Result<(), Error> {
        if amount_minor <= 0 {
            return Err(Error::InvalidAmount);
        }
        if expires_ledger <= e.ledger().sequence() {
            return Err(Error::InvalidExpiry);
        }
        payer.require_auth();
        let key = DataKey::Quote(quote_id.clone());
        if e.storage().persistent().has(&key) {
            return Err(Error::QuoteExists);
        }
        e.storage().persistent().set(
            &key,
            &Quote {
                merchant,
                payer,
                amount_minor,
                currency,
                expires_ledger,
                status: QuoteStatus::Open,
            },
        );
        e.storage()
            .persistent()
            .extend_ttl(&key, QUOTE_LIFETIME_THRESHOLD, QUOTE_BUMP_LEDGERS);
        QuoteCreated { quote_id }.publish(&e);
        Ok(())
    }

    pub fn mark_paid(e: Env, quote_id: BytesN<32>) -> Result<(), Error> {
        let key = DataKey::Quote(quote_id.clone());
        let mut quote = Self::read_quote(&e, &key)?;
        if quote.status != QuoteStatus::Open {
            return Err(Error::InvalidStatus);
        }
        if e.ledger().sequence() > quote.expires_ledger {
            return Err(Error::QuoteExpired);
        }
        quote.payer.require_auth();
        quote.status = QuoteStatus::Paid;
        e.storage().persistent().set(&key, &quote);
        e.storage()
            .persistent()
            .extend_ttl(&key, QUOTE_LIFETIME_THRESHOLD, QUOTE_BUMP_LEDGERS);
        QuotePaid { quote_id }.publish(&e);
        Ok(())
    }

    pub fn get_quote(e: Env, quote_id: BytesN<32>) -> Result<Quote, Error> {
        Self::read_quote(&e, &DataKey::Quote(quote_id))
    }
}

impl QuoteRegistryContract {
    fn read_admin(e: &Env) -> Result<Address, Error> {
        e.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    fn read_quote(e: &Env, key: &DataKey) -> Result<Quote, Error> {
        e.storage()
            .persistent()
            .get(key)
            .ok_or(Error::QuoteNotFound)
    }
}

#[cfg(test)]
mod test {
    extern crate std;

    use super::{Error, QuoteRegistryContract, QuoteRegistryContractClient, QuoteStatus};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

    fn id(e: &Env, value: u8) -> BytesN<32> {
        BytesN::from_array(e, &[value; 32])
    }

    fn setup<'a>(e: &'a Env) -> (QuoteRegistryContractClient<'a>, Address, Address, Address) {
        let admin = Address::generate(e);
        let merchant = Address::generate(e);
        let payer = Address::generate(e);
        let contract_id = e.register(QuoteRegistryContract, ());
        let client = QuoteRegistryContractClient::new(e, &contract_id);
        e.mock_all_auths();
        client.initialize(&admin);
        (client, admin, merchant, payer)
    }

    #[test]
    fn quote_and_rate_round_trip() {
        let e = Env::default();
        let (client, _admin, merchant, payer) = setup(&e);
        client.publish_rate(
            &String::from_str(&e, "USDC/PHP"),
            &5830,
            &100,
            &(e.ledger().sequence() + 100),
        );
        assert_eq!(
            client.get_rate(&String::from_str(&e, "USDC/PHP")).numerator,
            5830
        );
        client.create_quote(
            &id(&e, 1),
            &merchant,
            &payer,
            &1_500_000,
            &String::from_str(&e, "USDC"),
            &(e.ledger().sequence() + 100),
        );
        client.mark_paid(&id(&e, 1));
        assert_eq!(client.get_quote(&id(&e, 1)).status, QuoteStatus::Paid);
    }

    #[test]
    fn duplicate_quote_and_duplicate_payment_are_rejected() {
        let e = Env::default();
        let (client, _admin, merchant, payer) = setup(&e);
        let expires = e.ledger().sequence() + 100;
        client.create_quote(
            &id(&e, 2),
            &merchant,
            &payer,
            &1,
            &String::from_str(&e, "USDC"),
            &expires,
        );
        assert_eq!(
            client.try_create_quote(
                &id(&e, 2),
                &merchant,
                &payer,
                &1,
                &String::from_str(&e, "USDC"),
                &expires
            ),
            Err(Ok(Error::QuoteExists))
        );
        client.mark_paid(&id(&e, 2));
        assert_eq!(
            client.try_mark_paid(&id(&e, 2)),
            Err(Ok(Error::InvalidStatus))
        );
    }
}
