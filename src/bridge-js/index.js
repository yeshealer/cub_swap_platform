const Web3 = require("web3");

// Please don't abuse this infura api key :)
const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/df34aeb4a6ba4faf803ee8fddfc76aac'));

const ABI = require("./utils/FactoryABI.json")
const ERC20ABI = require("./utils/ERC20.json")
const ABI_BRIDGE = require("./utils/BridgeABI.json");
const BRIDGE_CONTRACT = '';

const WLEO = '0x73a9fb46e228628f8f9bb9004eca4f4f529d3998';
const PAIRS = [
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
]

/*
* LeoBridge, ERC20 -> BEP20
* 1) Ask user for input token contract and amount, output token, recipient. check if they are supported: isInputSupported() and isOutputSupported()
* 2a) Check if user approved swap contract to spend input tokens: isApproved(userAddres, input, amount)
* 2b) If it's not approved, ask user to approve it: callApprove(token, amount) NOTE: if user wants  to swap 1 token that has 18 decimals, use 1 * Math.pow(10, 18);
* 4) Call bridge contract: callBridge(_inputToken, _inputAmount, _minAmountOut, _recipient), _minAmountOut can be 0 for now
* That's it :)
*
*/

function isInputSupported(input){
  let supported = require("./utils/tokens/Uniswap.json")
  for (i in supported){
    if (supported[i].token0.id == input || supported[i].token1.id == input){
      return true;
    }
  }
  return false;
}

function isOutputSupported(output){
  let supported = require("./utils/tokens/Pancake.json")
  for (i in supported){
    if (supported[i].token0.id == input || supported[i].token1.id == input){
      return true;
    }
  }
  return false;
}

// Return id (contract address), decimals, name
function getInputTokenDetails(contract){
  let tokens = require("./utils/tokens/Uniswap.json")
  for (i in tokens){
    if (tokens[i].token0.id == contract){
      return tokens[i].token0;
    } else if (tokens[i].token1.id == contract) {
      return tokens[i].token1;
    }
  }
  return false;
}

async function pairExists(token0, token1){
  let factoryContract = new web3.eth.Contract(ABI, '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f');
  let isPair = await factoryContract.methods.getPair(token0, token1).call();
  let exists = isPair == '0x0000000000000000000000000000000000000000' ? false : true;
  return exists;
}

async function getRoute(input){
  let isBestPair;
  for (i in PAIRS){
    let exists = await pairExists(input, PAIRS[i])
    if (exists){
      return [input, PAIRS[i], WLEO]
    }
  }
}

async function callBridge(_inputToken, _inputAmount, _minAmountOut, _recipient){
  const _path = await getRoute(_inputToken);
  const contractObject = new web3.eth.Contract(ABI_BRIDGE, BRIDGE_CONTRACT);
  const contractFunction = contractObject.methods['entrance'](_inputToken, _inputAmount, _minAmountOut, _path, _recipient);
  await callMetamask(contractFunction);
}

async function callApprove(token, amount){
  const contractObject = new web3.eth.Contract(ERC20ABI, token);
  const contractFunction = contractObject.methods['approve'](BRIDGE_CONTRACT, amount);
  await callMetamask(contractFunction);
}

async function isApproved(userAddres, input, amount){
  let tokenContract = new web3.eth.Contract(ERC20ABI, input);
  let isApproved = await tokenContract.methods.allowance(userAddres, BRIDGE_CONTRACT).call()
  if (isApproved >= amount){
    return true;
  } else {
    return false;
  }
}

async function callMetamask(contractFunction){
  if (typeof window.ethereum !== 'undefined') {
    let accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    // Call swap contract
    const functionAbi = contractFunction.encodeABI();
    const transactionParameters = {
      nonce: '0x00', // ignored by MetaMask
      to: contract, // Required except during contract publications.
      from: account, // must match user's active address.
      data: functionAbi, // Optional, but used for defining smart contract creation and interaction.
      chainId: 1, // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
      gas: '0x186A0'
    };
    const txHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [transactionParameters],
    });
  } else {
    alert("MetaMask is not installed!")
  }
}

start()
