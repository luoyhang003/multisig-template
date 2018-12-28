let FIBOS = require('fibos.js');
var AsciiTable = require('ascii-table')

let coroutine = require('coroutine')
let test = require('test');

let config = require('./config.json');

let ENV = 'testnet';

test.setup();

describe("multi-sig template", () => {
	let multisigAccount = config[ENV].accounts[0].accountName;
	let proposal_name = "test1";

	let keys = [];

	config[ENV].accounts.forEach((it) => {
		keys.push(it.privateKey)
	});

	let fibos = FIBOS({
		chainId: config[ENV].chainId,
		keyProvider: keys,
		httpEndpoint: config[ENV].httpEndpoint,
		logger: {
			log: null,
			error: null
		}
	});

	it('grant multi-account permissions to active', () => {
		fibos.updateauthSync({
		    account: multisigAccount,
		    permission: "active",
		    parent: 'owner',
		    auth: {
		        threshold: 2,
		        keys: [],
		        "accounts": [{
		            "permission": {
		                "actor": config[ENV].accounts[1].accountName,
		                "permission": "active"
		            },
		            "weight": 1
		        },{
		            "permission": {
		                "actor": config[ENV].accounts[2].accountName,
		                "permission": "active"
		            },
		            "weight": 1
		        }]
		    }
		}, {
		        authorization: multisigAccount
		    });
	});

	it('check multi-sig account permission', () => {
		console.warn("========= Account Info =========");
		console.notice(fibos.getAccountSync(multisigAccount).permissions);
	});

	it('propose a multi-sig proposal to transfer', () => {
		let ctx = fibos.contractSync("eosio.msig");
		let requested = [{
							"actor": config[ENV].accounts[1].accountName,
							"permission": "active"
						}, {
							"actor": config[ENV].accounts[2].accountName, 
							"permission": "active"
						}]

		let r = ctx.proposeSync({
			"proposer": multisigAccount,
			"proposal_name": proposal_name,
			"requested": requested,
			"trx": {
				"expiration": "2020-01-01T00:30",
				"ref_block_num": 0,
				"ref_block_prefix": 0,
				"max_net_usage_words": 0,
				"max_cpu_usage_ms": 0,
				"delay_sec": 0,
				"actions": [{
					'account': 'eosio.token',
					'name': 'transfer',
					'authorization': [{
						"actor": multisigAccount,
						"permission": "active"
					}],
					'data': {
						'from': multisigAccount,
						"to": config[ENV].accounts[2].accountName,
						"quantity": "0.1000 EOS",
						"memo": "multi-sig transfer"
					}
				}]
			}
		}, {
			authorization: multisigAccount
		});
	});

	it('check approvals', () => {
		console.warn("========== Proposal Info ==========");
		console.notice(fibos.getTableRowsSync(true, "eosio.msig", multisigAccount, "proposal"))
		console.warn("========== Approvals Info ==========");
		console.notice(fibos.getTableRowsSync(true, "eosio.msig", multisigAccount, "approvals"))
	});

	it('approve for proposal use account1', () => {
		let ctx = fibos.contractSync("eosio.msig");
		var r = ctx.approveSync({
				"proposer": multisigAccount,
				"proposal_name": proposal_name,
				"level": {
					"actor": config[ENV].accounts[1].accountName,
					"permission": "active"
				}
			}, {
				"authorization": config[ENV].accounts[1].accountName
			});
	});

	it('approve for proposal use account1', () => {
		let ctx = fibos.contractSync("eosio.msig");
		var r = ctx.approveSync({
				"proposer": multisigAccount,
				"proposal_name": proposal_name,
				"level": {
					"actor": config[ENV].accounts[2].accountName,
					"permission": "active"
				}
			}, {
				"authorization": config[ENV].accounts[2].accountName
			});
	});

	it('check approvals', () => {
		console.warn("========== Proposal Info ==========");
		console.notice(fibos.getTableRowsSync(true, "eosio.msig", multisigAccount, "proposal"))
		console.warn("========== Approvals Info ==========");
		console.notice(fibos.getTableRowsSync(true, "eosio.msig", multisigAccount, "approvals"))
	});

	it('exec proposal', () => {
		console.warn("========== Balance Info Before: ==========");
		console.notice(fibos.getTableRowsSync(true, "eosio.token", multisigAccount, "accounts"));

		let ctx = fibos.contractSync("eosio.msig");
		let r = ctx.execSync(multisigAccount, proposal_name, multisigAccount, {
			authorization: multisigAccount
		});

		coroutine.sleep(3000);

		console.warn("========== Balance Info After: ==========");
		console.notice(fibos.getTableRowsSync(true, "eosio.token", multisigAccount, "accounts"));
	})
});




require.main === module && test.run(console.DEBUG);
