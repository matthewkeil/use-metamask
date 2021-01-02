import { useContext, useEffect, useState, useRef }  from "react";
import { MetaStateContext, MetaDispatchContext }    from "./store";


const chains = (chainId) => {
  if (!!Number(chainId) && chainId.length > 9) {
    return "local";
  }
  switch (chainId) {
    case "1" : return "mainnet";
    case "3" : return "ropsten";
    case "4" : return "rinkeby";
    case "5" : return "goerli";
    case "42": return "kovan";
    default  : return `unknown`;
  }
};

async function getNetwork(provider) {
  try {
    const chainId = await provider.request({
      method: "net_version",
      params: []
    });
    return { id: chainId, name: chains(chainId) };
  } catch (error) {
    throw Error(error);
  }
}

async function getAccount(provider) {
  try {
    const accounts = await provider.request({
      method: "eth_requestAccounts",
      params: []
    });
    return accounts;
  } catch (error) {
    throw Error(error);
  }
}

const useMetamask = () => {
  const state            = useContext(MetaStateContext);
  const dispatch         = useContext(MetaDispatchContext);
  const _isMounted       = useRef(true);
  const _isConnectCalled = useRef(false);
  const [ provider ]     = useState(window.ethereum);
  useEffect(() => {
    return () => {
      _isMounted.current = false;
    }
  }, []);
  
  const connect = async (Web3Interface, settings = {}) => {
    if (!provider)                throw Error("Metamask is not available");
    if (!Web3Interface) 
      throw Error("Web3 Provider is required. You can use either ethers.js or web3.js");
    if (!_isMounted.current)      throw Error("Component is not mounted");
    if (_isConnectCalled.current) throw Error("Connect method already called");
    _isConnectCalled.current = true;
    
    const _web3 = new Web3Interface(
      ...(Object.keys(settings).length 
        ? [provider, settings] 
        : [provider])
    );
    dispatch({ type: "SET_WEB3", payload: _web3 });
    
    const _chainInfo = await getNetwork(provider);
    dispatch({ type: "SET_CHAIN", payload: _chainInfo });

    const _account = await getAccount(provider);
    if (_account.length) {
      dispatch({ type: "SET_CONNECTED", payload: true });
      dispatch({ type: "SET_ACCOUNT", payload: _account });
    }

    window.ethereum.on("chainChanged", (chainId) => {
      const _chainId   = parseInt(chainId, 16).toString();
      const _chainInfo = { id: _chainId, name: chains(_chainId) };
      dispatch({ type: "SET_CHAIN", payload: _chainInfo });
    });
    window.ethereum.on("accountsChanged", (accounts) => {
      if (!accounts.length) dispatch({ type: "SET_CONNECTED", payload: false });
      dispatch({ type: "SET_ACCOUNT", payload: accounts });
    });
    _isConnectCalled.current = false;
  };

  return {
    connect,
    metaState: { ...state, isAvailable: !!provider },
  };
}

export default useMetamask;
