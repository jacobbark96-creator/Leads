import re

with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

# I will find the block starting with "      <div className=\"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4\">"
# and replace it down to "      {/* Map & Chart */}"

old_block = content[content.find('      {/* 4 Cards */}'):content.find('      {/* Map & Chart */}')]

new_block = """      {/* 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Account */}
        <div className="bg-[#E8F2FF] rounded-2xl p-3 border border-[#B3D1FF] shadow-sm flex flex-col justify-between relative overflow-hidden h-[150px]">
          <div className="absolute -right-4 -bottom-4 text-[#0066FF] opacity-[0.05]">
            <CreditCard className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-[9px] font-bold text-[#0047B3] uppercase tracking-widest flex items-center gap-1">
                OPENLEAD ACCOUNT <span className="w-2.5 h-2.5 rounded-full border border-[#0047B3]/30 text-[7px] flex items-center justify-center text-[#0047B3]">i</span>
              </h3>
              <div className="w-5 h-5 rounded-md bg-white/80 flex items-center justify-center text-[#0066FF] shadow-sm backdrop-blur-sm">
                <CreditCard className="w-2.5 h-2.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 mb-0 tracking-tight leading-none">£{creditBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="text-[8px] font-bold text-[#0066FF] mt-0.5">Available to spend</div>
          </div>
          <div className="mt-1 relative z-10">
            <div className="flex justify-between text-[8px] font-bold text-[#0047B3]/70 mb-0.5">
              <span>Credit limit</span>
              <span>Credit used</span>
            </div>
            <div className="flex justify-between text-[9px] font-bold text-gray-900 mb-1">
              <span>£{Number(profile?.trade_limit_setting || 10000).toLocaleString()}</span>
              <span>£{Number(profile?.current_trade_usage || 5150).toLocaleString()}</span>
            </div>
            <div className="w-full bg-[#CCE0FF] rounded-full h-1 mb-0.5">
              <div className="bg-[#0066FF] h-1 rounded-full" style={{ width: '51.5%' }}></div>
            </div>
            <div className="text-[8px] text-right text-[#0066FF] font-bold mb-1">51.5% of credit used</div>
            
            <div className="flex justify-between items-end pt-1 border-t border-[#CCE0FF]">
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="text-[8px] font-bold text-[#0047B3]/70">Spent this month</div>
                  <span className="text-[7px] bg-[#10B981]/10 text-[#10B981] px-1 py-0 rounded font-bold">↑ 12%</span>
                </div>
                <div className="text-xs font-black text-gray-900 flex items-center gap-1">
                  £2,840 
                </div>
              </div>
              <button onClick={() => setShowInvoicesModal(true)} className="text-[8px] font-bold text-[#0066FF] flex items-center gap-0.5 hover:underline">
                Invoices <span className="text-[9px] leading-none">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Purchased Leads */}
        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow h-[150px]">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">PURCHASED LEADS</h3>
            <div className="w-5 h-5 rounded-md bg-[#E8F2FF] flex items-center justify-center text-[#0066FF]">
              <ShoppingCart className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-black text-gray-900 mb-0.5 leading-none">{stats.bought || 24}</div>
            <div className="text-[8px] font-bold text-[#10B981] flex items-center gap-1">
              <TrendingUp className="w-2 h-2" /> 18% vs last month
            </div>
          </div>
          <div className="h-6 mt-1 w-full -ml-1 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Purchased" stroke="#0066FF" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Surveyed Leads */}
        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow h-[150px]">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">SURVEYED LEADS</h3>
            <div className="w-5 h-5 rounded-md bg-[#FFF3E0] flex items-center justify-center text-[#F59E0B]">
              <CalendarIcon className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-black text-gray-900 mb-0.5 leading-none">{stats.sat || 17}</div>
            <div className="flex flex-col gap-0">
              <div className="text-[8px] font-bold text-gray-500">{boughtToSat || 71}% survey rate</div>
              <div className="text-[8px] font-bold text-[#10B981] flex items-center gap-1">
                <TrendingUp className="w-2 h-2" /> 9% vs last month
              </div>
            </div>
          </div>
          <div className="h-6 mt-1 w-full -ml-1 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Surveyed" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Won Deals */}
        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow h-[150px]">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">WON DEALS</h3>
            <div className="w-5 h-5 rounded-md bg-[#F0FDF4] flex items-center justify-center text-[#10B981]">
              <Trophy className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-black text-gray-900 mb-0.5 leading-none">{stats.won || 6}</div>
            <div className="flex flex-col gap-0">
              <div className="text-[8px] font-bold text-gray-500">{satToWon || 25}% conversion rate</div>
              <div className="text-[8px] font-bold text-[#10B981] flex items-center gap-1">
                <TrendingUp className="w-2 h-2" /> 4% vs last month
              </div>
            </div>
          </div>
          <div className="h-6 mt-1 w-full -ml-1 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Won" stroke="#10B981" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

"""

if old_block:
    new_content = content.replace(old_block, new_block)
    with open('src/app/(dashboard)/client-portal/page.tsx', 'w') as f:
        f.write(new_content)
    print("Replaced!")
else:
    print("Could not find block!")
