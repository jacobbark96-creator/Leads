with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

return_idx = content.find('  return (\n    <div className="flex flex-col gap-5')
end_idx = content.rfind('}')

new_return = """  return (
    <div className="flex flex-col gap-4 w-full max-w-[1400px] mx-auto pb-6">
      {/* 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Account */}
        <div className="bg-[#E8F2FF] rounded-2xl p-4 border border-[#B3D1FF] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-[#0066FF] opacity-[0.05]">
            <CreditCard className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-bold text-[#0047B3] uppercase tracking-widest flex items-center gap-1.5">
                OPENLEAD ACCOUNT <span className="w-3 h-3 rounded-full border border-[#0047B3]/30 text-[8px] flex items-center justify-center text-[#0047B3]">i</span>
              </h3>
              <div className="w-6 h-6 rounded-lg bg-white/80 flex items-center justify-center text-[#0066FF] shadow-sm backdrop-blur-sm">
                <CreditCard className="w-3 h-3" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-0.5 tracking-tight">£{creditBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="text-[10px] font-bold text-[#0066FF]">Available to spend</div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="flex justify-between text-[10px] font-bold text-[#0047B3]/70 mb-1">
              <span>Credit limit</span>
              <span>Credit used</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-900 mb-1.5">
              <span>£{Number(profile?.trade_limit_setting || 10000).toLocaleString()}</span>
              <span>£{Number(profile?.current_trade_usage || 5150).toLocaleString()}</span>
            </div>
            <div className="w-full bg-[#CCE0FF] rounded-full h-1.5 mb-1.5">
              <div className="bg-[#0066FF] h-1.5 rounded-full" style={{ width: '51.5%' }}></div>
            </div>
            <div className="text-[9px] text-right text-[#0066FF] font-bold mb-3">51.5% of credit used</div>
            
            <div className="flex justify-between items-end pt-3 border-t border-[#CCE0FF]">
              <div>
                <div className="text-[10px] font-bold text-[#0047B3]/70 mb-0.5">Spent this month</div>
                <div className="text-sm font-black text-gray-900 flex items-center gap-2">
                  £2,840 
                  <span className="text-[9px] bg-[#10B981]/10 text-[#10B981] px-1.5 py-0.5 rounded-md font-bold">↑ 12%</span>
                </div>
              </div>
            </div>
            <button onClick={() => setShowInvoicesModal(true)} className="text-[10px] font-bold text-[#0066FF] mt-3 flex items-center gap-1 hover:underline">
              View billing & invoices <span className="text-sm leading-none">→</span>
            </button>
          </div>
        </div>

        {/* Card 2: Purchased Leads */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">PURCHASED LEADS</h3>
            <div className="w-6 h-6 rounded-lg bg-[#E8F2FF] flex items-center justify-center text-[#0066FF]">
              <ShoppingCart className="w-3 h-3" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-3xl font-black text-gray-900 mb-1">{stats.bought || 24}</div>
            <div className="text-[10px] font-bold text-[#10B981] flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> 18% vs last month
            </div>
          </div>
          <div className="h-10 mt-3 w-full -ml-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Purchased" stroke="#0066FF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Surveyed Leads */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">SURVEYED LEADS</h3>
            <div className="w-6 h-6 rounded-lg bg-[#FFF3E0] flex items-center justify-center text-[#F59E0B]">
              <CalendarIcon className="w-3 h-3" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-3xl font-black text-gray-900 mb-1">{stats.sat || 17}</div>
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] font-bold text-gray-500">{boughtToSat || 71}% survey rate</div>
              <div className="text-[10px] font-bold text-[#10B981] flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 9% vs last month
              </div>
            </div>
          </div>
          <div className="h-10 mt-3 w-full -ml-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Surveyed" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Won Deals */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">WON DEALS</h3>
            <div className="w-6 h-6 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-[#10B981]">
              <Trophy className="w-3 h-3" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-3xl font-black text-gray-900 mb-1">{stats.won || 6}</div>
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] font-bold text-gray-500">{satToWon || 25}% conversion rate</div>
              <div className="text-[10px] font-bold text-[#10B981] flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 4% vs last month
              </div>
            </div>
          </div>
          <div className="h-10 mt-3 w-full -ml-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Won" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Map & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-1">
        <div className="lg:col-span-5 bg-[#F8FAFC] rounded-2xl shadow-sm flex flex-col min-h-[250px] relative overflow-hidden border-none">
          <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-center z-10 bg-gradient-to-b from-white/80 to-transparent pointer-events-none">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
              <MapPin className="w-3 h-3 text-[#0066FF]" /> Lead Map
            </h3>
            <div className="flex gap-1.5 pointer-events-auto">
              <select className="text-[10px] font-bold text-gray-700 bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-lg px-2 py-1 outline-none hover:bg-gray-50 cursor-pointer">
                <option>All Statuses</option>
              </select>
              <select className="text-[10px] font-bold text-gray-700 bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-lg px-2 py-1 outline-none hover:bg-gray-50 cursor-pointer">
                <option>This Month</option>
              </select>
            </div>
          </div>
          <div className="absolute inset-0 w-full h-full">
            {leads.length > 0 ? (
              <DynamicMap leads={leads} onLeadClick={handleLeadClick} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium bg-[#F8FAFC]">Map loading...</div>
            )}
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex gap-3 bg-white/95 backdrop-blur-md border border-gray-200 px-3 py-1.5 rounded-lg text-[9px] font-bold shadow-sm z-10">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0066FF]"></div>Purchased</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>Surveyed</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div>Won</div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col min-h-[250px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-[#0066FF]" /> Performance Overview
            </h3>
            <select className="text-[10px] font-bold text-gray-600 bg-gray-50 border-none rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-gray-100 transition-colors">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex gap-6 mb-4 border-b border-gray-100 pb-3">
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Leads Purchased</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.bought || 24}</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 18% vs last month</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Surveyed</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.sat || 17}</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 9% vs last month</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Won</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.won || 6}</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 4% vs last month</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1 tracking-wide">Conversion Rate</div>
              <div className="text-xl font-black text-gray-900 mb-1">{satToWon || 25}%</div>
              <div className="text-[9px] font-bold text-[#10B981]">↑ 4% vs last month</div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 600 }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 600 }} />
                <Tooltip cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="Purchased" stroke="#0066FF" strokeWidth={2} dot={{ r: 3, fill: '#0066FF', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Surveyed" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Won" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-3 text-[9px] font-bold text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0066FF]"></div>Purchased</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>Surveyed</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div>Won</div>
          </div>
        </div>
      </div>

      {/* Bottom Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Pipeline */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-6">
            <Filter className="w-3 h-3 text-[#0066FF]" /> Lead Pipeline
          </h3>
          <div className="flex justify-between text-center flex-1 relative px-1 mt-2">
            {/* Visual Funnel Background graphic */}
            <div className="absolute top-[14px] left-6 right-6 h-3 bg-gray-100 rounded-full z-0"></div>
            
            {/* Colored segment bars */}
            <div className="absolute top-[14px] left-6 h-3 bg-[#0066FF]/20 rounded-l-full z-0" style={{width: '25%'}}></div>
            <div className="absolute top-[14px] left-[25%] h-3 bg-[#3B82F6]/20 z-0" style={{width: '25%'}}></div>
            <div className="absolute top-[14px] left-[50%] h-3 bg-[#F59E0B]/20 z-0" style={{width: '25%'}}></div>
            <div className="absolute top-[14px] left-[75%] h-3 bg-[#10B981]/20 rounded-r-full z-0" style={{width: '15%'}}></div>
            
            <div className="flex flex-col items-center z-10 relative">
              <div className="text-[9px] font-bold text-[#0066FF] uppercase mb-2 bg-white px-1.5 rounded tracking-wide">Purchased</div>
              <div className="w-8 h-8 rounded-full bg-white border-[2.5px] border-[#0066FF] flex items-center justify-center text-xs font-black text-gray-900 mb-2 shadow-sm">{stats.bought || 24}</div>
              <div className="text-[9px] font-bold text-gray-400 mt-auto leading-tight">87%<br/>contact</div>
            </div>
            <div className="flex flex-col items-center z-10 relative">
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
              <div className="text-[9px] font-bold text-gray-400 mt-auto opacity-0">-</div>
            </div>
          </div>
          <button className="text-[10px] font-bold text-[#0066FF] mt-6 flex items-center gap-1 hover:underline justify-center bg-[#F4F9FF] py-2 rounded-lg transition-colors hover:bg-[#E8F2FF]">
            View all leads <span className="text-sm leading-none">→</span>
          </button>
        </div>

        {/* Needs Attention */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-gray-500" /> Leads Needing Attention
            </h3>
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-700">6</div>
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100">
                  <Phone className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-gray-700">Not contacted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900">3 leads</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
            <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
                  <CalendarIcon className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-gray-700">Survey booking needed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900">2 leads</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
            <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 shadow-sm border border-purple-100">
                  <FileText className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-gray-700">Proposal follow up</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900">1 lead</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
            <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100">
                  <Clock className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-gray-700">No activity in 7+ days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900">4 leads</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
          </div>
          <button className="text-[10px] font-bold text-[#0066FF] mt-3 flex items-center gap-1 hover:underline justify-center bg-[#F4F9FF] py-2 rounded-lg transition-colors hover:bg-[#E8F2FF]">
            View all my leads <span className="text-sm leading-none">→</span>
          </button>
        </div>

        {/* Top Leads */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-3">
            <Star className="w-3 h-3 text-yellow-400" /> Top Leads
          </h3>
          <div className="space-y-2 flex-1">
            {topLeads.map((lead, i) => (
              <div key={lead.id} className="flex items-center gap-2.5 justify-between group cursor-pointer bg-gray-50 border border-gray-200 hover:border-[#0066FF] hover:shadow-sm hover:bg-[#F8FAFC] rounded-lg p-2.5 transition-all" onClick={() => handleLeadClick(lead as any)}>
                <div className="text-[10px] font-black text-gray-400 bg-white border border-gray-200 w-5 h-5 rounded-full flex items-center justify-center group-hover:bg-[#E8F2FF] group-hover:text-[#0066FF] group-hover:border-[#0066FF]/30 transition-colors shadow-sm">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-900 truncate group-hover:text-[#0066FF] transition-colors">{lead.name || 'UK Foods Manufacturing'}</div>
                  <div className="text-[10px] font-bold text-gray-500 truncate mt-0.5">{lead.location || 'Manchester'} • £{lead.sale_amount || '4,200'}/mo</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-[11px] font-black text-[#10B981]">£{(lead as any).system_size ? (lead as any).system_size * 1000 : '162,000'}</div>
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
              <div className="text-xs text-gray-400 text-center py-6 font-medium">No leads found</div>
            )}
          </div>
          <button className="text-[10px] font-bold text-[#0066FF] mt-3 flex items-center gap-1 hover:underline justify-center bg-[#F4F9FF] py-2 rounded-lg transition-colors hover:bg-[#E8F2FF]">
            View all leads <span className="text-sm leading-none">→</span>
          </button>
        </div>
      </div>

      {/* Floating Ask Max Button */}
      <Link href="/openlead-max" className="fixed bottom-6 right-6 bg-[#0F172A] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xl hover:scale-105 transition-transform z-50">
        <Sparkles className="w-3.5 h-3.5 text-[#39CCCC]" />
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
print("Shrunk dashboard!")
