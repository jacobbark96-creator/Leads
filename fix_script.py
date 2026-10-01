with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

return_idx = content.find('  return (\n    <div className="flex flex-col gap-3')
if return_idx == -1:
    return_idx = content.find('  return (\n    <div className="flex flex-col gap-4')
if return_idx == -1:
    return_idx = content.find('  return (\n    <div')

end_idx = content.rfind('}')

new_return = """  return (
    <div className="flex flex-col gap-4 w-full max-w-[1400px] mx-auto pb-10 pt-2">
      {/* 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Account */}
        <div className="bg-gradient-to-br from-[#F4F9FF] to-[#E8F2FF] rounded-2xl p-5 border border-[#CCDEFF] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-[#0066FF] opacity-[0.03]">
            <CreditCard className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                OPENLEAD ACCOUNT <span className="w-3 h-3 rounded-full border border-gray-300 text-[8px] flex items-center justify-center text-gray-400">i</span>
              </h3>
              <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center text-[#0066FF] shadow-sm backdrop-blur-sm">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-0.5">£{creditBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="text-[10px] font-bold text-[#0066FF]">Available to spend</div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="flex justify-between text-[10px] font-medium text-gray-500 mb-1">
              <span>Credit limit</span>
              <span>Credit used</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-900 mb-1.5">
              <span>£{Number(profile?.trade_limit_setting || 10000).toLocaleString()}</span>
              <span>£{Number(profile?.current_trade_usage || 5150).toLocaleString()}</span>
            </div>
            <div className="w-full bg-[#D6E5FF] rounded-full h-1.5 mb-1.5">
              <div className="bg-[#0066FF] h-1.5 rounded-full" style={{ width: '51.5%' }}></div>
            </div>
            <div className="text-[9px] text-right text-[#0066FF] font-medium mb-3">51.5% of credit used</div>
            
            <div className="flex justify-between items-end pt-3 border-t border-[#D6E5FF]">
              <div>
                <div className="text-[9px] font-medium text-gray-500 mb-0.5">Spent this month</div>
                <div className="text-sm font-bold text-gray-900">£2,840 <span className="text-[9px] text-[#10B981] ml-2 font-bold">↑ 12% vs last month</span></div>
              </div>
            </div>
            <button onClick={() => setShowInvoicesModal(true)} className="text-[10px] font-bold text-[#0066FF] mt-3 flex items-center gap-1 hover:underline">
              View billing & invoices <span className="text-sm leading-none">→</span>
            </button>
          </div>
        </div>

        {/* Card 2: Purchased Leads */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">PURCHASED LEADS</h3>
              <div className="w-7 h-7 rounded-lg bg-[#E8F2FF] flex items-center justify-center text-[#0066FF]">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-black text-gray-900 mb-1">{stats.bought || 24}</div>
              <div className="text-[10px] font-bold text-[#10B981]">↑ 18% vs last month</div>
            </div>
          </div>
          <div className="h-16 mt-3 w-full -ml-1.5 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Purchased" stroke="#0066FF" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Surveyed Leads */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">SURVEYED LEADS</h3>
              <div className="w-7 h-7 rounded-lg bg-[#FFF3E0] flex items-center justify-center text-[#F59E0B]">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-black text-gray-900 mb-1">{stats.sat || 17}</div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[9px] font-bold text-gray-500">{boughtToSat || 71}% survey rate</div>
                <div className="text-[9px] font-bold text-[#10B981]">↑ 9% vs last month</div>
              </div>
            </div>
          </div>
          <div className="h-16 mt-3 w-full -ml-1.5 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Surveyed" stroke="#F59E0B" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Won Deals */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">WON DEALS</h3>
              <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-[#10B981]">
                <Trophy className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-black text-gray-900 mb-1">{stats.won || 6}</div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[9px] font-bold text-gray-500">{satToWon || 25}% conversion rate</div>
                <div className="text-[9px] font-bold text-[#10B981]">↑ 4% vs last month</div>
              </div>
            </div>
          </div>
          <div className="h-16 mt-3 w-full -ml-1.5 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Won" stroke="#10B981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Map & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-1">
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm flex flex-col min-h-[300px] relative overflow-hidden p-0 border border-gray-100">
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-white/90 to-transparent pointer-events-none">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 pointer-events-auto bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
              <MapPin className="w-3.5 h-3.5 text-[#0066FF]" /> Lead Map
            </h3>
            <div className="flex gap-1.5 pointer-events-auto">
              <select className="text-[10px] font-medium text-gray-700 bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-lg px-2.5 py-1.5 outline-none hover:bg-gray-50 cursor-pointer">
                <option>All Statuses</option>
              </select>
              <select className="text-[10px] font-medium text-gray-700 bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-lg px-2.5 py-1.5 outline-none hover:bg-gray-50 cursor-pointer">
                <option>This Month</option>
              </select>
            </div>
          </div>
          <div className="flex-1 w-full h-full bg-[#F8FAFC]">
            {leads.length > 0 ? (
              <DynamicMap leads={leads} onLeadClick={handleLeadClick} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">Map loading...</div>
            )}
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex gap-3 bg-white/95 backdrop-blur-md border border-gray-100 px-3 py-2 rounded-xl text-[9px] font-bold shadow-sm z-10">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0066FF]"></div>Purchased</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>Surveyed</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div>Won</div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#0066FF]" /> Performance Overview
            </h3>
            <select className="text-[10px] font-medium text-gray-600 bg-gray-50 border-none rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-gray-100 transition-colors">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex gap-8 mb-5 border-b border-gray-50 pb-4">
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1">Leads Purchased</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.bought || 24}</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 18% vs last month</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1">Surveyed</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.sat || 17}</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 9% vs last month</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1">Won</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.won || 6}</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 4% vs last month</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1">Conversion Rate</div>
              <div className="text-xl font-black text-gray-900 mb-1">{satToWon || 25}%</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 4% vs last month</div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                <Tooltip cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="Purchased" stroke="#0066FF" strokeWidth={2.5} dot={{ r: 3, fill: '#0066FF', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Surveyed" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Won" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-5 mt-4 text-[9px] font-bold text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0066FF]"></div>Purchased</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>Surveyed</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div>Won</div>
          </div>
        </div>
      </div>

      {/* Bottom Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Pipeline */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-8">
            <Filter className="w-3.5 h-3.5 text-[#0066FF]" /> Lead Pipeline
          </h3>
          <div className="flex justify-between text-center flex-1 relative px-2">
            {/* Background Bar */}
            <div className="absolute top-[26px] left-6 right-6 h-1.5 bg-gray-100 rounded-full z-0"></div>
            <div className="absolute top-[26px] left-6 h-1.5 bg-gradient-to-r from-[#0066FF] via-[#F59E0B] to-[#10B981] rounded-full z-0" style={{width: '75%'}}></div>
            
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#0066FF] uppercase mb-2 bg-white px-1.5 rounded">Purchased</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#0066FF] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.bought || 24}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">87%<br/>contact</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#3B82F6] uppercase mb-2 bg-white px-1.5 rounded">Contacted</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#3B82F6] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">21</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">81%<br/>survey</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#F59E0B] uppercase mb-2 bg-white px-1.5 rounded">Surveyed</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#F59E0B] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.sat || 17}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">65%<br/>proposal</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#8B5CF6] uppercase mb-2 bg-white px-1.5 rounded">Proposal</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#8B5CF6] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">11</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">55%<br/>win rate</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#10B981] uppercase mb-2 bg-white px-1.5 rounded">Won</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#10B981] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.won || 6}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto opacity-0">-</div>
            </div>
          </div>
          <button className="text-[10px] font-bold text-[#0066FF] mt-6 flex items-center gap-1 hover:underline">
            View all leads <span className="text-sm leading-none">→</span>
          </button>
        </div>

        {/* Needs Attention */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" /> Leads Needing Attention
            </h3>
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">6</div>
          </div>
          <div className="space-y-2.5 flex-1">
            <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-gray-700">Not contacted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">3 leads</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
            <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
                  <CalendarIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-gray-700">Survey booking needed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">2 leads</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
            <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 shadow-sm border border-purple-100">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-gray-700">Proposal follow up</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">1 lead</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
            <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-gray-700">No activity in 7+ days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">4 leads</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
          </div>
          <button className="text-[10px] font-bold text-[#0066FF] mt-3 flex items-center gap-1 hover:underline">
            View all my leads <span className="text-sm leading-none">→</span>
          </button>
        </div>

        {/* Top Leads */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-4">
            <Star className="w-3.5 h-3.5 text-yellow-400" /> Top Leads
          </h3>
          <div className="space-y-2 flex-1">
            {topLeads.map((lead, i) => (
              <div key={lead.id} className="flex items-center gap-3 justify-between group cursor-pointer bg-white border border-gray-100 hover:border-[#0066FF] hover:shadow-md rounded-xl p-3 transition-all" onClick={() => handleLeadClick(lead)}>
                <div className="text-[10px] font-black text-gray-300 bg-gray-50 w-5 h-5 rounded-full flex items-center justify-center group-hover:bg-[#E8F2FF] group-hover:text-[#0066FF] transition-colors">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-900 truncate group-hover:text-[#0066FF] transition-colors">{lead.name || 'UK Foods Manufacturing'}</div>
                  <div className="text-[9px] font-medium text-gray-500 truncate">{lead.location || 'Manchester'} • £{lead.sale_amount || '4,200'}/mo</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-[10px] font-bold text-[#10B981]">£{lead.system_size ? lead.system_size * 1000 : '162,000'}</div>
                  <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    lead.purchase_status === 'new' ? 'bg-[#E8F2FF] text-[#0066FF] border-[#0066FF]/20' :
                    lead.purchase_status === 'sat' ? 'bg-[#FFF3E0] text-[#F59E0B] border-[#F59E0B]/20' :
                    'bg-[#F0FDF4] text-[#10B981] border-[#10B981]/20'
                  }`}>
                    {lead.purchase_status === 'sat' ? 'Surveyed' : lead.purchase_status === 'new' ? 'Purchased' : 'Won'}
                  </div>
                </div>
              </div>
            ))}
            {topLeads.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-6">No leads found</div>
            )}
          </div>
          <button className="text-[10px] font-bold text-[#0066FF] mt-3 flex items-center gap-1 hover:underline">
            View all leads <span className="text-sm leading-none">→</span>
          </button>
        </div>
      </div>

      {/* Floating Ask Max Button */}
      <Link href="/openlead-max" className="fixed bottom-6 right-6 bg-[#0F172A] text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xl hover:scale-105 transition-transform z-50">
        <Sparkles className="w-4 h-4 text-[#39CCCC]" />
        Ask Max
      </Link>

      {/* Modals remain the same */}
      <CalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} leads={leads} />
      {selectedLead && (
        <PurchasedLeadModal isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} lead={selectedLead} onUpdateStatus={updatePurchaseStatus} />
      )}
      {selectedPendingLead && (
        <MarketplaceLeadModal isOpen={isPendingModalOpen} onClose={() => { setIsPendingModalOpen(false); setSelectedPendingLead(null); }} lead={selectedPendingLead} onPurchase={() => {}} />
      )}
      <WelcomeModal isOpen={showWelcomeModal} onClose={closeWelcomeModal} />
      <AdvisorModal isOpen={showAdvisorModal} onClose={() => setShowAdvisorModal(false)} advisor={advisorDetails} />
      {profile && (
        <PasswordResetModal isOpen={showPasswordResetModal} onClose={() => setShowPasswordResetModal(false)} userId={profile.id} />
      )}
      {showTopUpModal && profile && clientId && (
        <TopUpModal isOpen={showTopUpModal} onClose={() => setShowTopUpModal(false)} clientId={clientId} userId={profile.id} userEmail={profile.email || ''} />
      )}
      <InvoicesModal isOpen={showInvoicesModal} onClose={() => setShowInvoicesModal(false)} />
      <PerformanceModal isOpen={showPerformanceModal} onClose={() => setShowPerformanceModal(false)} leads={leads} />
    </div>
  );
"""

new_content = content[:return_idx] + new_return + "\n}\n"

with open('src/app/(dashboard)/client-portal/page.tsx', 'w') as f:
    f.write(new_content)
print("Updated dashboard layout")
