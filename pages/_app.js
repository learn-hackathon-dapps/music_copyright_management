import '../styles/globals.css'
import Link from 'next/link'

async function getAccount() {
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  const account = accounts[0];
}

function Marketplace({ Component, pageProps }) {
  return (
    <div>
      <nav className="border-b p-6">
        <p className="text-4xl font-bold">An NFT Marketplace</p>
        <div className="flex mt-4">
          <Link href="/">
            <a className="mr-4 text-black-500">
              Home
            </a>
          </Link>
          <Link href="/redeem-vouchers">
            <a className="mr-6 text-black-500">
              Redeem Vouchers
            </a>
          </Link>
          <Link href="/my-assets">
            <a className="mr-6 text-black-500">
              My NFTs
            </a>
          </Link>
          <Link href="/contracts">
            <a className="mr-6 text-black-500">
              Contracts
            </a>
          </Link>
          <Link href="/deploy-contract">
            <a className="mr-6 text-black-500">
              Deploy Contract
            </a>
          </Link>
        </div>
        {/* <div>
        <button onClick={getAccount} className="font-bold mt-4 bg-blue-500 text-white rounded p-4 shadow-lg">
          Connect Account
        </button>
        </div> */}
      </nav>
      <Component {...pageProps} />
    </div>
  )
}

export default Marketplace