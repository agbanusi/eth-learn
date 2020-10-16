import React, { Component } from "react";
import SimpleStorageContract from "./contracts/SimpleStorage.json";
import getWeb3 from "./getWeb3";
import ipfs from './ipfs';
import truffleContract from '@truffle/contract'
import IPFSInboxContract from './contracts/IPFSInbox.json'

import "./App.css";

class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, contract: null, ipfsHash:null };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      //const networkId = await web3.eth.net.getId();
      //const deployedNetwork = SimpleStorageContract.networks[networkId];
      //const instance = new web3.eth.Contract(
        //SimpleStorageContract.abi,
       // deployedNetwork && deployedNetwork.address,
      //);
      const contract = truffleContract(IPFSInboxContract)
      contract.setProvider(web3.currentProvider);
      const instance = await contract.deployed();
      this.setState({web3, accounts, contract: instance})
      this.setEventListener()
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      //this.setState({ web3, accounts, contract: instance }, this.runExample);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  runExample = async () => {
    const { accounts, contract } = this.state;

    // Stores a given value, 5 by default.
    await contract.methods.set(5).send({ from: accounts[0] });

    // Get the value from the contract to prove it worked.
    const response = await contract.methods.get().call();

    // Update state with the result.
    this.setState({ storageValue: response });
  };

  captureFile=(e)=>{
    e.stopPropagation()
    e.preventDefault()
    const file = e.target.files[0]
    let reader = new window.FileReader()
    reader.readAsArrayBuffer(file)
    reader.onloadend=()=>this.convertToBuffer(reader)
  }

  convertToBuffer= async(reader)=>{
    const buffer = await Buffer.from(reader.result);
    this.setState({buffer})
  }

  onIPFSSubmit= async(e)=>{
    e.preventDefault();
    await ipfs.add(this.state.buffer, (err,ipfsHash)=>{
      console.log(err, ipfsHash)
      this.setState({ipfsHash: ipfsHash[0].hash})
    })
  }

  setEventListener =()=>{
    this.state.contract.inboxResponse().on('data', result=>{
      this.setState({receivedIPFS: result.args[0]})
    })
  }

  handleChangeAddress=(e)=>{
    this.setState({formAddress: e.target.value})
  }

  handleChangeIPFS=(e)=>{
    this.setState({formIPFS: e.target.value})
  }

  handleSend=(e)=>{
    e.preventDefault();
    const {contract, accounts} = this.state
    document.getElementById('new-notification-form').reset()
    this.setState({showNotification: true})
    contract.sendIPFS(this.state.formAddress, this.state.formIPFS, {from: accounts[0]}).then(result=>{
      this.setState({formAddress:""})
      this.setState({formIPFS:""})
    })
  }

  handleReceiveIPFS=(e)=>{
    e.preventDefault()
    const {contract, accounts} = this.state
    contract.checkInbox({from: accounts[0]})
  }

  render() {

    return (
      <div className="App">
        <h1>Add a  file to IPFS here.</h1>
        <form id='ipfs-hahs-form' onSubmit={this.onIPFSSubmit}>
        <input type='file' onChange={this.captureFile} />
        <button type='submit'>Send</button>
        </form>
        <p>The IPFS hash is {this.state.ipfsHash} </p>
        <h2> Send notifications here</h2>
        <form id='new-notification-form' onSubmit={this.handleSend}>
          <label>
            Receiver address
            <input type='text' value={this.state.value} onChange={this.handleChangeAddress} />
          </label>
          <label>
            IPFS address
            <input type='text' value={this.state.value} onChange={this.handleChangeIPFS} />
          </label>
          <input type="submit" value="Submit" />
        </form>
        <h3> Receive notifications </h3>
        <button onClick={this.handleReceiveIPFS}>Receive IPFS</button>
        <p>{this.state.receivedIPFS}</p>
      </div>
    );
  }
}

export default App;
