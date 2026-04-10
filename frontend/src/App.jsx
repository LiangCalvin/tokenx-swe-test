import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { 
  VAULT_SHARES_ADDRESS, 
  THB_MOCK_ADDRESS, 
  FUND_VAULT_ADDRESS,
  VAULT_SHARES_ABI, 
  ERC20_ABI 
} from './constants/index';

function App() {
  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState({
    nav: "0",
    totalShares: "0",
    treasury: "0",
    userShares: "0",
    aum: "0",
  });
  const [depositAmount, setDepositAmount] = useState("");
  const [redeemShares, setRedeemShares] = useState("");
  
  useEffect(() => {
   
  const fetchStats = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // ตรวจสอบเบื้องต้น
      const network = await provider.getNetwork();
      if (network.chainId !== 31337n) return; // ถ้าไม่ใช่ Hardhat ให้หยุดทำงาน

      const vaultContract = new ethers.Contract(
        VAULT_SHARES_ADDRESS,
        VAULT_SHARES_ABI,
        provider,
      );
      const thbContract = new ethers.Contract(
        THB_MOCK_ADDRESS,
        ERC20_ABI,
        provider,
      );

      // ดึงข้อมูลจริงจาก Contract
      const [navValue, totalShares, treasuryBalance] = await Promise.all([
        vaultContract.nav(),
        vaultContract.totalSupply(),
        thbContract.balanceOf(FUND_VAULT_ADDRESS),
      ]);

      // ดึงข้อมูล User Shares
      let userShares = 0n;
      if (account) {
        userShares = await vaultContract.balanceOf(account);
      }

      // คำนวณ AUM: (Total Shares * NAV) / 10^18
      const aum = (totalShares * navValue) / ethers.parseUnits("1", 18);

      // ✅ หัวใจสำคัญ: อัปเดต State เพื่อให้หน้าจอเปลี่ยนเลข
      setStats({
        nav: ethers.formatEther(navValue),
        totalShares: ethers.formatUnits(totalShares, 18),
        treasury: ethers.formatUnits(treasuryBalance, 18),
        userShares: ethers.formatUnits(userShares, 18),
        aum: ethers.formatEther(aum),
      });

      console.log("Dashboard Updated!");
    } catch (err) {
      console.error("Detailed Error:", err);
    }
  };

    fetchStats();

    // ตั้งเวลา Refresh ทุก 10 วินาที (Optional)
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [account]);

  // เพิ่มฟังก์ชันตรวจสอบสถานะกระเป๋าตอนโหลดหน้าเว็บ
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        // ตรวจสอบว่าเคย Connect ไว้แล้วหรือยัง
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }

        // ดักฟังการเปลี่ยน Account
        window.ethereum.on("accountsChanged", (accounts) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            toast.success("Account Changed");
          } else {
            setAccount(null);
            toast.error("Wallet Disconnected");
          }
        });

        // ดักฟังการเปลี่ยน Network (Chain)
        window.ethereum.on("chainChanged", () => {
          window.location.reload(); // แนะนำให้โหลดหน้าใหม่เมื่อเปลี่ยน Chain
        });
      }
    };

    checkConnection();
  }, []);

  // ฟังก์ชันเชื่อมต่อ Wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        toast.success("Wallet Connected!");
      } catch (err) {
        toast.error("Connection Failed");
        console.log("error:", err);
      }
    } else {
      toast.error("Please install MetaMask");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-600">
          <BarChart3 size={32} /> VaultX Dashboard
        </h1>
        <button
          onClick={connectWallet}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2 transition-all"
        >
          <Wallet size={20} />
          {account
            ? `${account.slice(0, 6)}...${account.slice(-4)}`
            : "Connect Wallet"}
        </button>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Current NAV" value={`${stats.nav} THB`} />
          <StatCard
            title="Total AUM"
            value={`${stats.aum} THB`}
            color="text-green-600"
          />
          <StatCard title="Total Vault Shares" value={stats.totalShares} />
          <StatCard title="Treasury Balance" value={`${stats.treasury} THB`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Deposit Section */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <ArrowDownCircle className="text-blue-500" size={28} />
              <h2 className="text-xl font-semibold">Deposit THB</h2>
            </div>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Amount (THB)"
                className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-blue-500 border-none"
              />
              <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all">
                Approve & Deposit
              </button>
            </div>
          </div>

          {/* Redemption Section */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <ArrowUpCircle className="text-red-500" size={28} />
              <h2 className="text-xl font-semibold">Request Redemption</h2>
            </div>
            <p className="text-gray-500 mb-4 text-sm">
              Your shares:{" "}
              <span className="font-bold text-gray-900">
                {stats.userShares} vTHB
              </span>
            </p>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Shares (vTHB)"
                className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-red-500 border-none"
              />
              <button className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all">
                Request Redeem
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, color = "text-gray-900" }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <p className="text-gray-500 text-sm mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default App;
