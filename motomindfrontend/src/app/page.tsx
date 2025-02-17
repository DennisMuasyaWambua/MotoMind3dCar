"use client";

import Image from "next/image";
import { ConnectButton, useReadContract, useActiveAccount,useSendTransaction} from "thirdweb/react";
import thirdwebIcon from "@public/thirdweb.svg";
import {defineChain, Chain} from "thirdweb/chains";
import { getContract,prepareContractCall } from "thirdweb";
import { client } from "./client";
import { useState } from "react";

export default function Home() {

  const [policyHolder, setPolicyHolder] = useState("");
  const [newRiskScore, setNewRiskScore] = useState(0);
  const { mutate: sendTransaction } = useSendTransaction();

  const chain = defineChain({
    id: 1,
    rpc: "https://rpc.sepolia-api.lisk.com/",
    chainId: 4202,
    nativeCurrency: {
      name: "Lisk Sepolia Testnet",
      symbol: "ETH",
      decimals: 18,
    },
  });
  console.log(chain);

  const activeAccount = useActiveAccount();
  console.log("address", activeAccount?.address);
  
  const contract = getContract({
    client: client,
    address: "0xc2dFD5Cb92decB685787cEDC536046CBC251fe2A",
    chain: defineChain(4202),
    // abi: [...],
  });
  console.log(contract);


  const { data: maxRiskScore, isLoading } = useReadContract({
    contract: contract,
    method: "function MAX_RISK_SCORE() view returns (uint256)",
    params: [],
  });

  // const contract   = useContractEvents({
  //   contract,
  //   events: [tokensClaimedEvent({ claimer: account?.address })],
  // });
  return (
    <main className="p-4 pb-10 min-h-[100vh] flex items-center justify-center container max-w-screen-lg mx-auto">
      <div className="py-20">
        <div className="flex justify-center mb-20">
          <ConnectButton
            client={client}
            appMetadata={{
              name: "Example App",
              url: "https://example.com",
            }}
          />
          
        </div>


        {activeAccount?.address && (
          <div className="flex justify-center mb-20">
            <p className="text-sm text-zinc-300">
              Connected as <code className="text-zinc-400">{activeAccount?.address}</code>
            </p>
            <div style={{ 
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              }}>
                <input type="string" value={policyHolder} onChange={(e) => setPolicyHolder(e.target.value)} 
                style={{
                  marginBottom: "1rem",
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid black"
                }}
                />
                <input type="number" value={newRiskScore} onChange={(e) => setNewRiskScore(parseInt(e.target.value))} 
                style={{
                  marginBottom: "1rem",
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid black"
                }}
                />
                <Web3Button 
                onClick = {() => {
                  const transaction = prepareContractCall({
                    contract,
                    method:
                    "function updateRiskScore(address policyHolder, uint256 newRiskScore)",
                  params: [policyHolder, newRiskScore],
                  });
                  sendTransaction(transaction);
                }}
                  Set New Value/>
                <Web3Button 
                onClick = {() => {
                  const transaction = prepareContractCall({
                    contract,
                    method: "function purchasePolicy() payable",
                    params: [],
                  });
                  sendTransaction(transaction);
                }}
                  Set New Value/>
              </div>
          </div >
        )}

        <div className="flex justify-center mb-20">
          <h1> Max Risk Score: {isLoading ? 0 : maxRiskScore.toString() }</h1>
        </div>

      

        <ThirdwebResources />
      </div>
    </main>
  );
}

function Header() {
  return (
    <div>

    </div>
    // <header className="flex flex-col items-center mb-20 md:mb-20">
    //   <Image
    //     src={thirdwebIcon}
    //     alt=""
    //     className="size-[150px] md:size-[150px]"
    //     style={{
    //       filter: "drop-shadow(0px 0px 24px #a726a9a8)",
    //     }}
    //   />

    //   <h1 className="text-2xl md:text-6xl font-semibold md:font-bold tracking-tighter mb-6 text-zinc-100">
    //     thirdweb SDK
    //     <span className="text-zinc-300 inline-block mx-1"> + </span>
    //     <span className="inline-block -skew-x-6 text-blue-500"> Next.js </span>
    //   </h1>

    //   <p className="text-zinc-300 text-base">
    //     Read the{" "}
    //     <code className="bg-zinc-800 text-zinc-300 px-2 rounded py-1 text-sm mx-1">
    //       README.md
    //     </code>{" "}
    //     file to get started.
    //   </p>
    // </header>
  );
}

function ThirdwebResources() {
  return (


  <div></div>



    // <div className="grid gap-4 lg:grid-cols-3 justify-center">
    //   <ArticleCard
    //     title="thirdweb SDK Docs"
    //     href="https://portal.thirdweb.com/typescript/v5"
    //     description="thirdweb TypeScript SDK documentation"
    //   />

    //   <ArticleCard
    //     title="Components and Hooks"
    //     href="https://portal.thirdweb.com/typescript/v5/react"
    //     description="Learn about the thirdweb React components and hooks in thirdweb SDK"
    //   />

    //   <ArticleCard
    //     title="thirdweb Dashboard"
    //     href="https://thirdweb.com/dashboard"
    //     description="Deploy, configure, and manage your smart contracts from the dashboard."
    //   />
    // </div>
  );
}

// function ArticleCard(props: {
//   title: string;
//   href: string;
//   description: string;
// }) {
//   return (
//     <a
//       href={props.href + "?utm_source=next-template"}
//       target="_blank"
//       className="flex flex-col border border-zinc-800 p-4 rounded-lg hover:bg-zinc-900 transition-colors hover:border-zinc-700"
//     >
//       <article>
//         <h2 className="text-lg font-semibold mb-2">{props.title}</h2>
//         <p className="text-sm text-zinc-400">{props.description}</p>
//       </article>
//     </a>
//   );
// }
