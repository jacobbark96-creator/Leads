const fs = require('fs');
const file = 'src/app/(dashboard)/client-portal/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const returnIndex = content.indexOf('  return (\n    <div className="flex flex-col h-auto lg:h-[calc(100vh-160px)]');
if (returnIndex === -1) {
  console.log("Could not find return block");
  process.exit(1);
}

const newReturn = `  const chartData = [
    { name: '1 May', Purchased: 20, Surveyed: 10, Won: 5 },
    { name: '8 May', Purchased: 25, Surveyed: 12, Won: 6 },
    { name: '15 May', Purchased: 23, Surveyed: 14, Won: 5 },
    { name: '22 May', Purchased: 28, Surveyed: 15, Won: 7 },
    { name: '29 May', Purchased: 26, Surveyed: 13, Won: 6 },
    { name: '5 Jun', Purchased: 30, Surveyed: 17, Won: 8 },
  ];

  const topLeads = leads.slice(0, 3);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-10">
      <div className="mb-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          Welcome back, {profile?.name?.split(' ')[0] || 'Ioana'} <span className="text-2xl">👋</span>
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">Here's what's happening with your leads today.</p>
      </div>

      {/* 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1: Account */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                OPENLEAD ACCOUNT <span className="w-3 h-3 rounded-full border border-gray-300 text-[8px] flex items-center justify-center text-gray-400">i</span>
              </h3>
              <div className="w-8 h-8 rounded-xl bg-[#E8F2FF] flex items-center justify-center text-[#0066FF]">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">£{creditBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="text-xs font-bold text-[#0066FF]">Available to spend</div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Credit limit</span>
              <span>Credit used</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 mb-2">
              <span>£{Number(profile?.trade_limit_setting || 10000).toLocaleString()}</span>
              <span>£{Number(profile?.current_trade_usage || 5150).toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
              <div className="bg-[#0066FF] h-1.5 rounded-full" style={{ width: '51.5%' }}></div>
            </div>
            <div className="text-[10px] text-right text-gray-400 font-medium mb-4">51.5% of credit used</div>
            
            <div className="flex justify-between items-end pt-4 border-t border-gray-50">
              <div>
                <div className="text-[10px] font-medium text-gray-500 mb-0.5">Spent this month</div>
                <div className="text-sm font-bold text-gray-900">£2,840 <span className="text-[10px] text-[#10B981] ml-2 font-bold">↑ 12% vs last month</span></div>
              </div>
            </div>
            <button onClick={() => setShowInvoicesModal(true)} className="text-xs font-bold text-[#0066FF] mt-4 flex items-center gap-1 hover:underline">
              View billing & invoices <span className="text-lg leading-none">→</span>
            </button>
          </div>
        </div>

        {/* Card 2: Purchased Leads */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">PURCHASED LEADS</h3>
              <div className="w-8 h-8 rounded-xl bg-[#E8F2FF] flex items-center justify-center text-[#0066FF]">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-900 mb-1">{stats.bought || 24}</div>
            <div className="text-xs font-bold text-[#10B981]">↑ 18% vs last month</div>
          </div>
          <div className="h-16 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Purchased" stroke="#0066FF" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Surveyed Leads */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">SURVEYED LEADS</h3>
              <div className="w-8 h-8 rounded-xl bg-[#FFF3E0] flex items-center justify-center text-[#F59E0B]">
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-900 mb-1">{stats.sat || 17}</div>
            <div className="text-xs font-bold text-gray-500 mb-1">{boughtToSat || 71}% survey rate</div>
            <div className="text-xs font-bold text-[#10B981]">↑ 9% vs last month</div>
          </div>
          <div className="h-16 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Surveyed" stroke="#F59E0B" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Won Deals */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">WON DEALS</h3>
              <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] flex items-center justify-center text-[#10B981]">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-900 mb-1">{stats.won || 6}</div>
            <div className="text-xs font-bold text-gray-500 mb-1">{satToWon || 25}% conversion rate</div>
            <div className="text-xs font-bold text-[#10B981]">↑ 4% vs last month</div>
          </div>
          <div className="h-16 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="Won" stroke="#10B981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Map & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-2">
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0066FF]" /> Lead Map
            </h3>
            <div className="flex gap-2">
              <select className="text-xs font-medium text-gray-600 bg-gray-50 border-none rounded-lg px-3 py-1.5 outline-none">
                <option>All Statuses</option>
              </select>
              <select className="text-xs font-medium text-gray-600 bg-gray-50 border-none rounded-lg px-3 py-1.5 outline-none">
                <option>This Month</option>
              </select>
            </div>
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden relative border border-gray-100 bg-[#F8FAFC]">
            {leads.length > 0 ? (
              <DynamicMap leads={leads} onLeadClick={handleLeadClick} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">Map loading...</div>
            )}
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex gap-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-[10px] font-bold shadow-sm z-10">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0066FF]"></div>Purchased</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>Surveyed</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div>Won</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0066FF]" /> Performance Overview
            </h3>
            <select className="text-xs font-medium text-gray-600 bg-gray-50 border-none rounded-lg px-3 py-1.5 outline-none">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex gap-8 mb-8 border-b border-gray-50 pb-4">
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Leads Purchased</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.bought || 24}</div>
              <div className="text-[10px] font-bold text-[#10B981]">↑ 18% vs last month</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Surveyed</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.sat || 17}</div>
              <div className="text-[10px] font-bold text-[#10B981]">↑ 9% vs last month</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Won</div>
              <div className="text-xl font-black text-gray-900 mb-1">{stats.won || 6}</div>
              <div className="text-[10px] font-bold text-[#10B981]">↑ 4% vs last month</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Conversion Rate</div>
              <div className="text-xl font-black text-gray-900 mb-1">{satToWon || 25}%</div>
              <div className="text-[10px] font-bold text-[#10B981]">↑ 4% vs last month</div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <Tooltip />
                <Line type="monotone" dataKey="Purchased" stroke="#0066FF" strokeWidth={2} dot={{ r: 3, fill: '#0066FF' }} />
                <Line type="monotone" dataKey="Surveyed" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B' }} />
                <Line type="monotone" dataKey="Won" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-[10px] font-bold text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0066FF]"></div>Purchased</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>Surveyed</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div>Won</div>
          </div>
        </div>
      </div>

      {/* Bottom Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Pipeline */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6">
            <Filter className="w-4 h-4 text-[#0066FF]" /> Lead Pipeline
          </h3>
          <div className="flex justify-between text-center flex-1">
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-bold text-[#0066FF] uppercase mb-3">Purchased</div>
              <div className="text-xl font-black text-gray-900 mb-6">{stats.bought || 24}</div>
              <div className="text-[10px] font-bold text-gray-400 mt-auto">87%<br/>contact rate</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-bold text-[#3B82F6] uppercase mb-3">Contacted</div>
              <div className="text-xl font-black text-gray-900 mb-6">21</div>
              <div className="text-[10px] font-bold text-gray-400 mt-auto">81%<br/>survey rate</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-bold text-[#F59E0B] uppercase mb-3">Surveyed</div>
              <div className="text-xl font-black text-gray-900 mb-6">{stats.sat || 17}</div>
              <div className="text-[10px] font-bold text-gray-400 mt-auto">65%<br/>proposal rate</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-bold text-[#8B5CF6] uppercase mb-3">Proposal</div>
              <div className="text-xl font-black text-gray-900 mb-6">11</div>
              <div className="text-[10px] font-bold text-gray-400 mt-auto">55%<br/>win rate</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-bold text-[#10B981] uppercase mb-3">Won</div>
              <div className="text-xl font-black text-gray-900 mb-6">{stats.won || 6}</div>
              <div className="text-[10px] font-bold text-gray-400 mt-auto opacity-0">-</div>
            </div>
          </div>
          <button className="text-xs font-bold text-[#0066FF] mt-8 flex items-center gap-1 hover:underline">
            View all leads <span className="text-lg leading-none">→</span>
          </button>
        </div>

        {/* Needs Attention */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" /> Leads Needing Attention
            </h3>
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">6</div>
          </div>
          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-gray-700">Not contacted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">3 leads</span>
                <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
            <div className="flex justify-between items-center group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-gray-700">Survey booking needed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">2 leads</span>
                <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
            <div className="flex justify-between items-center group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-gray-700">Proposal follow up</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">1 lead</span>
                <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
            <div className="flex justify-between items-center group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-gray-700">No activity in 7+ days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">4 leads</span>
                <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </div>
          </div>
          <button className="text-xs font-bold text-[#0066FF] mt-6 flex items-center gap-1 hover:underline">
            View all my leads <span className="text-lg leading-none">→</span>
          </button>
        </div>

        {/* Top Leads */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6">
            <Star className="w-4 h-4 text-yellow-400" /> Top Leads
          </h3>
          <div className="space-y-4 flex-1">
            {topLeads.map((lead, i) => (
              <div key={lead.id} className="flex items-center gap-3 justify-between group cursor-pointer" onClick={() => handleLeadClick(lead)}>
                <div className="text-xs font-black text-gray-400 w-4">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">{lead.name || 'UK Foods Manufacturing'}</div>
                  <div className="text-[10px] font-medium text-gray-500 truncate">{lead.location || 'Manchester'} • £{lead.sale_amount || '4,200'}/mo</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-xs font-bold text-[#10B981]">£{lead.system_size ? lead.system_size * 1000 : '162,000'}</div>
                  <div className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
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
              <div className="text-sm text-gray-400 text-center py-8">No leads found</div>
            )}
          </div>
          <button className="text-xs font-bold text-[#0066FF] mt-6 flex items-center gap-1 hover:underline">
            View all leads <span className="text-lg leading-none">→</span>
          </button>
        </div>
      </div>

      {/* Floating Ask Max Button */}
      <Link href="/openlead-max" className="fixed bottom-8 right-8 bg-[#0F172A] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition-transform z-50">
        <Sparkles className="w-5 h-5 text-[#39CCCC]" />
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
\`;

const newContent = content.substring(0, returnIndex) + newReturn + '\n}\n';
fs.writeFileSync(file, newContent);
console.log("Success");
