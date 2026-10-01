import re

with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

# Replace Card 1: Account
start_marker = "{/* Card 1: Account */}"
end_marker = "{/* Card 2: Purchased Leads */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_card1 = """{/* Card 1: Account */}
        <div className="bg-[#E8F2FF] rounded-2xl p-3 border border-[#B3D1FF] shadow-sm flex flex-col justify-between relative overflow-hidden h-[150px]">
          <div className="absolute -right-4 -bottom-4 text-[#0066FF] opacity-[0.05]">
            <CreditCard className="w-20 h-20" />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex justify-between items-start w-full mb-0">
              <h3 className="text-[9px] font-bold text-[#0047B3] uppercase tracking-widest flex items-center gap-1">
                OPENLEAD ACCOUNT <span className="w-2.5 h-2.5 rounded-full border border-[#0047B3]/30 text-[7px] flex items-center justify-center text-[#0047B3]">i</span>
              </h3>
              <div className="w-5 h-5 rounded-md bg-white/80 flex items-center justify-center text-[#0066FF] shadow-sm backdrop-blur-sm">
                <CreditCard className="w-2.5 h-2.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-0 tracking-tight leading-none text-center">£{((Number(profile?.trade_limit_setting || 10000) - Number(profile?.current_trade_usage || 5150))).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="text-[9px] font-bold text-[#0066FF] mt-0.5 text-center">Available to spend</div>
          </div>
          <div className="mt-1 relative z-10">
            <div className="flex justify-between text-[9px] font-bold text-[#0047B3]/70 mb-0.5">
              <span>Credit limit</span>
              <span>Credit used</span>
            </div>
            <div className="flex justify-between text-sm font-black text-gray-900 mb-1">
              <span>£{Number(profile?.trade_limit_setting || 10000).toLocaleString()}</span>
              <span>£{Number(profile?.current_trade_usage || 5150).toLocaleString()}</span>
            </div>
            <div className="w-full bg-[#CCE0FF] rounded-full h-1.5 mb-0.5">
              <div className="bg-[#0066FF] h-1.5 rounded-full" style={{ width: `${Math.min(100, (Number(profile?.current_trade_usage || 5150) / Number(profile?.trade_limit_setting || 10000)) * 100)}%` }}></div>
            </div>
            <div className="text-[8px] text-right text-[#0066FF] font-bold mb-1">{((Number(profile?.current_trade_usage || 5150) / Number(profile?.trade_limit_setting || 10000)) * 100).toFixed(1)}% of credit used</div>
            
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

        """

    new_content = content[:start_idx] + new_card1 + content[end_idx:]
    with open('src/app/(dashboard)/client-portal/page.tsx', 'w') as f:
        f.write(new_content)
    print("Fixed Card 1 via python script!")
else:
    print("Could not find markers.")