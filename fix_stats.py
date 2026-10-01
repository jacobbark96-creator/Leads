import re

with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

# Replace the stats block
old_stats_block = """  const stats = {
    bought: leads.length,
    sat: leads.filter(l => l.purchase_status === 'sat' || l.purchase_status === 'won').length,
    won: leads.filter(l => l.purchase_status === 'won').length,
  };
  const boughtToSat = stats.bought ? Math.round((stats.sat / stats.bought) * 100) : 0;
  const satToWon = stats.sat ? Math.round((stats.won / stats.sat) * 100) : 0;"""

new_stats_block = """  const stats = {
    bought: leads.length,
    contacted: leads.filter(l => ['contacted', 'sat', 'proposal', 'won'].includes(l.purchase_status)).length,
    sat: leads.filter(l => ['sat', 'proposal', 'won'].includes(l.purchase_status)).length,
    proposal: leads.filter(l => ['proposal', 'won'].includes(l.purchase_status)).length,
    won: leads.filter(l => l.purchase_status === 'won').length,
  };
  const boughtToSat = stats.bought ? Math.round((stats.sat / stats.bought) * 100) : 0;
  const satToWon = stats.sat ? Math.round((stats.won / stats.sat) * 100) : 0;
  const boughtToContacted = stats.bought ? Math.round((stats.contacted / stats.bought) * 100) : 0;
  const contactedToSat = stats.contacted ? Math.round((stats.sat / stats.contacted) * 100) : 0;
  const satToProposal = stats.sat ? Math.round((stats.proposal / stats.sat) * 100) : 0;
  const proposalToWon = stats.proposal ? Math.round((stats.won / stats.proposal) * 100) : 0;"""

if old_stats_block in content:
    content = content.replace(old_stats_block, new_stats_block)
    print("Replaced stats block")

# Replace pipeline numbers
old_pipeline_start = """            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#3B82F6] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Contacted</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#3B82F6] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">21</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">81%<br/>survey</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#F59E0B] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Surveyed</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#F59E0B] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.sat || 17}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">65%<br/>proposal</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#8B5CF6] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Proposal</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#8B5CF6] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">11</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">55%<br/>win rate</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#10B981] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Won</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#10B981] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.won || 6}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">&nbsp;</div>
            </div>"""

new_pipeline_start = """            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#3B82F6] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Contacted</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#3B82F6] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.contacted}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">{contactedToSat}%<br/>survey</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#F59E0B] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Surveyed</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#F59E0B] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.sat}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">{satToProposal}%<br/>proposal</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#8B5CF6] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Proposal</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#8B5CF6] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.proposal}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">{proposalToWon}%<br/>win rate</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#10B981] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Won</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#10B981] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.won}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">&nbsp;</div>
            </div>"""

if old_pipeline_start in content:
    content = content.replace(old_pipeline_start, new_pipeline_start)
    print("Replaced pipeline block 1")
else:
    print("Could not find pipeline block 1")

old_contact_rate = """<div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">87%<br/>contact</div>"""
new_contact_rate = """<div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">{boughtToContacted}%<br/>contact</div>"""

if old_contact_rate in content:
    content = content.replace(old_contact_rate, new_contact_rate)
    print("Replaced contact rate")

with open('src/app/(dashboard)/client-portal/page.tsx', 'w') as f:
    f.write(content)
