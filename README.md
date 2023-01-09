#  Defi Position Manager

Defi Position Manager is a set of smartcontracts allowing user to create multiple proxies from one address to manage different positions on protocols without build-in asset separation (like Maker). Also creation of new proxy mechanism was used as opportunity to redesign some parts of original Maker design to achieve following properties:
1) Cheaper deployment of every new proxy
2) Ability for a single user to own multiple proxies
3) Whitelisting of contracts preventing execution of untrusted logic contracts within usersProxy, as a mitigation of for instance DNS attacks on our website
4) Ability to not only delegatecall specific contract, but also call it directly from proxy if necessary
