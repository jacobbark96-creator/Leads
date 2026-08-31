with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

return_idx = content.find('  return (\n    <div className="flex flex-col gap-3')
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
            <div className="flex justifwith open('src/app/(dashboard)/client-portal/page.ts="    content = f.read()

return_idx = content.find('  return (\n    <div classap
return_idx = contentOPEif return_idx == -1:
    return_idx = content.find('  return (\n    <div')

endle    return_idx = coif
end_idx = content.rfind('}')

new_return = """  ret   
new_return = """  return (
    <di-lg    <div className="flex en      {/* 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grho      <div className"w        {/* Card 1: Account */}
        <div classdiv>
            <div class        <div className="bg-gra-g          <div className="absolute -right-6 -top-6 text-[#0066FF] opacity-[0Digits: 0, maximumFractionDigits: 0 })}</div>
            <div className="text-[10px] font-bold text-            <CreditCard className="w-32 h-32" />
          </div>
          <div -4          </div>
          <div className="relaex          <div n             <div className="flex justifw-1
return_idx = content.find('  return (\n    <div classap
return_idx = contentOPEif return_idx == -1:
    return_idclareturn_idx = contentOPEif return_idx == -1:
    return_idx00    return_idx = content.find('  returof
endle    return_idx = coif
end_idx = content.rfind('}   end_idx = content.rfind('r(
new_return =  ret