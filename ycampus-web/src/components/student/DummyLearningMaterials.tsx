import React, { useState, useRef, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bookmark, Volume2, Sparkles, Search, X, Send, Bot,
  Zap, ListChecks, Sigma, Network, AlertTriangle, Brain, MessageSquareQuote,
  Lightbulb, BookOpen, Eye, GitCompare, Workflow,
  Calculator, Building2, FileText, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningMaterialProps {
  subjectName: string;
  topicTitle: string;
}

type ToolkitTab = 'revision' | 'points' | 'formulas' | 'mindmap' | 'mistakes' | 'tricks' | 'viva';

const toolkitTabs: { id: ToolkitTab; label: string; icon: React.ElementType }[] = [
  { id: 'revision', label: 'Quick Revision', icon: Zap },
  { id: 'points', label: 'Key Points', icon: ListChecks },
  { id: 'formulas', label: 'Formulas', icon: Sigma },
  { id: 'mindmap', label: 'Mind Map', icon: Network },
  { id: 'mistakes', label: 'Mistakes', icon: AlertTriangle },
  { id: 'tricks', label: 'Tricks', icon: Brain },
  { id: 'viva', label: 'Viva', icon: MessageSquareQuote },
];

const aiQuickActions = [
  'Explain Simply',
  'In Telugu',
  'Like a Teacher',
  'Short Notes',
  'Flashcards',
  'Memory Tricks',
  'Summarize',
];

const LearningMaterial: React.FC<LearningMaterialProps> = ({ subjectName, topicTitle }) => {
  const [activeToolkit, setActiveToolkit] = useState<ToolkitTab>('revision');
  const [aiOpen, setAiOpen] = useState(false);
  const [toolkitSearch, setToolkitSearch] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ id: number; text: string; isUser: boolean }[]>([
    { id: 1, text: `Hi! I'm your AI Mentor for "${topicTitle || subjectName}". Ask me anything about this topic.`, isUser: false },
  ]);

  const topic = topicTitle || 'Hardness of Water';

  const sendAi = (text: string) => {
    if (!text.trim()) return;
    const id = Date.now();
    setAiMessages((m) => [
      ...m,
      { id, text, isUser: true },
      { id: id + 1, text: `Here's a clear explanation about "${topic}" — ${text}`, isUser: false },
    ]);
    setAiInput('');
  };

  return (
    <div className="h-full w-full bg-white">
      <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden">
        {/* MAIN CONTENT */}
        <ResizablePanel defaultSize={75} minSize={50}>
          <ScrollArea className="h-full">
            <article className="px-10 py-6 max-w-4xl mx-auto space-y-7 text-slate-700">
              {/* Topic Header */}
              <header className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{topic}</h1>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => setBookmarked(!bookmarked)}>
                    <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-blue-600 text-blue-600')} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              {topic === 'Hardness of Water' ? <HardnessOfWaterArticle /> : topic === 'Fluoride Management' ? <FluorideManagementArticle /> : topic === 'Water Softening' ? <WaterSofteningArticle /> : topic === 'Desalination' ? <DesalinationArticle /> : topic === 'Boiler Troubles' ? <BoilerTroublesArticle /> : topic === 'Battery Technology' ? <BatteryTechnologyArticle /> : topic === 'Fuel & Solar Cells' ? <FuelSolarCellsArticle /> : topic === 'Fuel and Solar Cells' ? <FuelSolarCellsArticle /> : topic === 'Fuel Cells & Solar Cells' ? <FuelSolarCellsArticle /> : topic === 'Corrosion Principles' ? <CorrosionPrinciplesArticle /> : topic === 'Corrosion Control' ? <CorrosionControlArticle /> : <>
              {/* 01 Definition */}
              <Section number="01" title="Definition" icon={BookOpen}>
                <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5">
                  <p className="text-[14px] leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">Potable water</span> is water that is safe and suitable for human consumption.
                    It should be free from harmful microorganisms, toxic chemicals, unpleasant taste, objectionable odor, and excessive impurities.
                    The process of converting raw water into safe drinking water is called <span className="font-medium text-blue-700">Potable Water Treatment</span>.
                  </p>
                </div>
              </Section>

              {/* 02 Understanding the Concept */}
              <Section number="02" title="Understanding the Concept" icon={Lightbulb}>
                <div className="space-y-3.5 text-[14px] leading-relaxed">
                  <p>
                    Every day, we use water for drinking, cooking, and other household activities. However, the water available in rivers,
                    lakes, ponds, and reservoirs is not completely safe for direct consumption.
                  </p>
                  <p className="text-slate-900 font-medium">Raw water may contain:</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {['Mud and suspended particles', 'Harmful bacteria and viruses', 'Organic waste', 'Dissolved chemicals', 'Bad odor and taste'].map((i) => (
                      <li key={i} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{i}
                      </li>
                    ))}
                  </ul>
                  <p>
                    If such water is consumed without treatment, it can cause diseases like
                    <span className="font-medium text-slate-900"> cholera, typhoid, dysentery, and diarrhea</span>.
                  </p>
                  <p>
                    To make water safe for drinking, it passes through several treatment stages. Each stage removes a particular type of impurity.
                    The final result is clean, clear, and safe drinking water supplied to homes, schools, hospitals, and industries.
                  </p>
                </div>
              </Section>

              {/* 03 Why is Water Treatment Necessary */}
              <Section number="03" title="Why is Water Treatment Necessary?" icon={Lightbulb}>
                <div className="space-y-3.5 text-[14px] leading-relaxed">
                  <p>
                    Imagine a village receiving water directly from a nearby river. During the rainy season, rainwater carries mud, sand,
                    leaves, and waste materials into the river. Animals may enter the water, and microorganisms may grow in it.
                  </p>
                  <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
                    <p className="text-[13px] text-slate-700">
                      Even though the water may look clear, it can still contain invisible bacteria and harmful substances.
                    </p>
                  </div>
                  <p className="text-slate-900 font-medium">Before supplying water to people, it must be treated to remove:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {['Physical impurities', 'Chemical impurities', 'Biological impurities'].map((t) => (
                      <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-800 text-center">
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* 04 Visual Understanding */}
              <Section number="04" title="Visual Understanding" icon={Workflow}>
                <p className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-3">Complete treatment flow</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
                  <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
                    <FlowChip>Raw Water</FlowChip>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <FlowChip>Sedimentation</FlowChip>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <FlowChip>Coagulation</FlowChip>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <FlowChip>Filtration</FlowChip>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <FlowChip>Chlorination</FlowChip>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <FlowChip tone="warn">Safe Drinking Water</FlowChip>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-[13px] text-slate-700 leading-relaxed space-y-1.5">
                  <p><span className="font-semibold text-slate-900">Diagram Explanation</span></p>
                  <p>• Raw water first enters the sedimentation tank where heavy particles settle down.</p>
                  <p>• Very fine particles are then removed through coagulation.</p>
                  <p>• The water is further purified by filtration.</p>
                  <p>• Finally, chlorination destroys harmful microorganisms and makes the water safe for drinking.</p>
                </div>
              </Section>

              {/* 05 Specifications of Drinking Water */}
              <Section number="05" title="Specifications of Drinking Water" icon={ListChecks}>
                <p className="text-[13px] text-slate-600 mb-3">To be considered safe for drinking, water should satisfy certain quality standards.</p>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-[13px]">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold w-1/3">Parameter</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Specification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[
                        ['Colour', 'Should be colourless. Colour may indicate contamination or dissolved impurities.'],
                        ['Odour', 'No unpleasant smell. Bad odor indicates organic matter or microbial contamination.'],
                        ['Taste', 'Pleasant taste; not excessively salty, bitter, or metallic.'],
                        ['pH Value', 'Desirable range between 6.5 and 8.5.'],
                        ['Turbidity', 'Clear and free from visible suspended particles.'],
                        ['Microorganisms', 'Disease-causing bacteria, viruses, and parasites must be absent.'],
                        ['Total Dissolved Solids (TDS)', 'Desirable limit ≈ 500 mg/L.'],
                      ].map(([k, v]) => (
                        <tr key={k} className="bg-white">
                          <td className="px-4 py-2.5 font-medium text-slate-900 align-top">{k}</td>
                          <td className="px-4 py-2.5 text-slate-600">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* 06 Sedimentation */}
              <Section number="06" title="Sedimentation" icon={BookOpen}>
                <StageBlock
                  definition="Sedimentation is the process of removing suspended impurities from water by allowing them to settle at the bottom under the action of gravity."
                  concept="When muddy water is left undisturbed for some time, heavier particles gradually settle at the bottom, while cleaner water remains at the top. Gravity slowly pulls denser particles downward, leaving clearer water above."
                  reason="Particles such as sand, mud, clay, and dust are denser than water. When water remains still, they lose motion and settle due to gravitational force."
                  example="Collect muddy water in a bucket after heavy rain. After a few hours, most mud settles at the bottom and the upper water becomes visibly cleaner — that is sedimentation."
                  applications={['Municipal water treatment plants', 'Wastewater treatment systems', 'Industrial water purification units']}
                  note="Sedimentation removes only heavier suspended particles. Very fine particles remain in water and require additional treatment."
                  visualTitle="Before vs After Sedimentation"
                  visualBefore={['Muddy Water', 'Muddy Water', 'Muddy Water']}
                  visualAfter={['Clear Water', 'Clear Water', 'Sludge']}
                />
              </Section>

              {/* 07 Coagulation */}
              <Section number="07" title="Coagulation" icon={BookOpen}>
                <StageBlock
                  definition="Coagulation is the process of adding suitable chemicals to water to convert very fine suspended particles into larger particles called flocs, which can settle easily."
                  concept="After sedimentation, some tiny particles still remain suspended and do not settle for hours. A coagulant — most commonly Alum (Aluminium Sulphate) — is added. It helps tiny particles join together to form larger, heavier flocs that settle easily."
                  reason="Tiny suspended particles carry similar electrical charges and repel each other. Alum neutralizes these charges so particles stick together and form larger flocs."
                  example="Fine flour particles floating in water are hard to remove individually. If they combine into larger lumps, removal becomes easy. Coagulation works in the same way."
                  applications={['Drinking water treatment plants', 'Industrial water purification', 'Sewage treatment facilities']}
                  note="Without coagulation, many fine impurities would pass through the treatment process and reduce water quality."
                  flow={['Tiny Particles', '+ Alum', 'Large Flocs', 'Settling']}
                />
              </Section>

              {/* 08 Filtration */}
              <Section number="08" title="Filtration" icon={BookOpen}>
                <StageBlock
                  definition="Filtration is the process of removing remaining suspended impurities by passing water through porous filtering materials."
                  concept="Even after sedimentation and coagulation, some impurities remain in water. Water is passed through several filter layers that trap impurities and allow clean water to pass through."
                  reason="The spaces between sand and gravel particles are small enough to trap suspended impurities. As water flows through the filter bed, dirt particles remain behind while purified water moves forward."
                  example="A tea strainer allows tea to pass while retaining tea leaves. Filters work in the same way — they let water through and trap unwanted particles."
                  applications={['Municipal treatment plants', 'Water purification systems', 'Household water filters']}
                  note="Filtration improves water clarity but does not completely destroy harmful microorganisms. Disinfection is still required."
                  flow={['Water', 'Fine Sand', 'Coarse Sand', 'Gravel', 'Clean Water']}
                />
              </Section>

              {/* 09 Chlorination */}
              <Section number="09" title="Chlorination" icon={BookOpen}>
                <StageBlock
                  definition="Chlorination is the process of adding chlorine to water to destroy harmful microorganisms and make water safe for drinking."
                  concept="Even after filtration, water may still contain bacteria, viruses, and disease-causing microorganisms. Chlorine destroys these organisms and makes water microbiologically safe."
                  reason="When chlorine is added, it forms powerful disinfecting substances that attack and destroy harmful microorganisms, preventing the spread of water-borne diseases."
                  example="Water supplied to homes by municipal authorities contains a small amount of chlorine to ensure safety during transportation through pipelines."
                  applications={['Municipal water supply systems', 'Swimming pools', 'Hospitals', 'Industrial water treatment plants']}
                  note="Too little chlorine may not kill all microorganisms; excessive chlorine can affect taste and odor."
                />
              </Section>

              {/* 10 Break-Point Chlorination */}
              <Section number="10" title="Break-Point Chlorination" icon={AlertTriangle}>
                <div className="space-y-3.5 text-[14px] leading-relaxed">
                  <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
                    <p className="text-[14px] text-slate-700">
                      Break-point chlorination is the stage at which sufficient chlorine has been added to water so that all impurities are oxidized
                      and free residual chlorine begins to appear.
                    </p>
                  </div>
                  <p>
                    Initially, chlorine reacts with bacteria, organic matter, and other impurities and gets consumed.
                    As more chlorine is added, a stage is reached where all impurities have been destroyed. Beyond this point,
                    additional chlorine remains as <span className="font-medium text-slate-900">free residual chlorine</span> — this is the break point.
                  </p>
                  <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
                    <p className="text-[13px] text-slate-700">
                      <span className="font-semibold text-slate-900">Why it matters · </span>
                      Residual chlorine acts as a protective shield, continuing to protect water from contamination as it travels through storage
                      tanks and pipelines.
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-medium pt-1">Process flow</p>
                  <div className="space-y-2">
                    {[
                      'Chlorine Added',
                      'Consumed by Impurities',
                      'All Impurities Destroyed',
                      'Break Point Reached',
                      'Residual Chlorine Appears',
                      'Safe Drinking Water',
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
                        <div className="h-6 w-6 shrink-0 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold flex items-center justify-center border border-blue-100">
                          {i + 1}
                        </div>
                        <p className="text-[13px] leading-relaxed pt-0.5 text-slate-700">{step}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-slate-900 font-medium pt-1">Engineering Applications</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {['Municipal water treatment plants', 'Public water supply systems', 'Industrial water treatment facilities'].map((t) => (
                      <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* 11 Topic Summary */}
              <Section number="11" title="Topic Summary" icon={FileText}>
                <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2 text-[14px] leading-relaxed text-slate-700">
                  <p>
                    Potable water treatment converts raw water into safe drinking water through the sequence:
                    <span className="font-medium text-slate-900"> Sedimentation → Coagulation → Filtration → Chlorination</span>.
                  </p>
                  <ul className="space-y-1 pl-1">
                    <li>• <span className="font-medium text-slate-900">Sedimentation</span> removes heavy suspended particles.</li>
                    <li>• <span className="font-medium text-slate-900">Coagulation</span> removes fine suspended particles by forming flocs.</li>
                    <li>• <span className="font-medium text-slate-900">Filtration</span> removes remaining impurities.</li>
                    <li>• <span className="font-medium text-slate-900">Chlorination</span> destroys harmful microorganisms.</li>
                    <li>• <span className="font-medium text-slate-900">Break-point chlorination</span> ensures complete disinfection and residual protection during distribution.</li>
                  </ul>
                </div>
              </Section>
              </>}
            </article>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle className="bg-slate-200" />

        {/* RIGHT PANEL */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full flex flex-col bg-slate-50/60 border-l border-slate-200">
            {aiOpen ? (
              <AIMentorPanel
                topic={topic}
                messages={aiMessages}
                input={aiInput}
                setInput={setAiInput}
                onSend={sendAi}
                onClose={() => setAiOpen(false)}
              />
            ) : (
              <ToolkitPanel
                activeTab={activeToolkit}
                setActiveTab={setActiveToolkit}
                search={toolkitSearch}
                setSearch={setToolkitSearch}
                onOpenAi={() => setAiOpen(true)}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

function HardnessOfWaterArticle() {
  return (
    <>
      {/* 01 Definition */}
      <Section number="01" title="Definition" icon={BookOpen}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5">
          <p className="text-[14px] leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Hardness of water</span> is the property of water that prevents
            it from producing lather easily with soap due to the presence of dissolved
            <span className="font-medium text-blue-700"> calcium and magnesium salts</span>.
          </p>
          <p className="mt-2 text-[13px] text-slate-600">
            In simple words, hard water requires more soap to produce foam and forms a white scum instead of lather.
          </p>
        </div>
      </Section>

      {/* 02 Understanding the Concept */}
      <Section number="02" title="Understanding the Concept" icon={Lightbulb}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <p>
            Have you ever noticed that soap produces plenty of foam at home but much less foam in some hostels,
            villages, or borewell water? Even after using a large amount of soap, clothes may not feel properly
            cleaned, and a white layer may appear on buckets or bathroom tiles.
          </p>
          <p>
            This happens because the water contains dissolved minerals, mainly calcium and magnesium salts.
            When soap is added to such water, these minerals react with the soap and form an insoluble substance
            called <span className="font-medium text-slate-900">soap scum</span>.
          </p>
          <p className="text-slate-900 font-medium">As a result:</p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {['Soap gets wasted', 'Less foam is produced', 'More soap is required for cleaning'].map((i) => (
              <li key={i} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{i}
              </li>
            ))}
          </ul>
          <p>This property of water is known as <span className="font-medium text-slate-900">hardness of water</span>.</p>
        </div>
      </Section>

      {/* 03 Why Does Hardness Occur */}
      <Section number="03" title="Why Does Hardness Occur?" icon={Lightbulb}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <p>
            As rainwater passes through rocks, soil, and underground layers, it dissolves various minerals present in them.
            Among these minerals, calcium and magnesium compounds dissolve easily in water.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {['Calcium salts', 'Magnesium salts'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-800 text-center">{t}</div>
            ))}
          </div>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              The higher the concentration of these salts, the harder the water becomes.
            </p>
          </div>
        </div>
      </Section>

      {/* 04 Real-Life Example */}
      <Section number="04" title="Real-Life Example" icon={Eye}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <p>Imagine two buckets of water — Bucket A contains rainwater, and Bucket B contains borewell water. If equal amounts of soap are added:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Bucket A · Rainwater</p>
              <p className="text-[13px] text-slate-700">Produces plenty of foam — contains very few dissolved minerals.</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-1">Bucket B · Borewell Water</p>
              <p className="text-[13px] text-slate-700">Produces very little foam — contains higher amounts of calcium and magnesium salts.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* 05 Visual Understanding */}
      <Section number="05" title="Visual Understanding" icon={Workflow}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Soft Water + Soap</p>
            <div className="flex flex-col items-center gap-2 text-[13px] font-medium">
              <FlowChip>Soft Water</FlowChip>
              <span className="text-slate-400">+</span>
              <FlowChip>Soap</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 rotate-90 text-slate-400" />
              <FlowChip tone="warn">More Foam · Easy Cleaning</FlowChip>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Hard Water + Soap</p>
            <div className="flex flex-col items-center gap-2 text-[13px] font-medium">
              <FlowChip>Hard Water</FlowChip>
              <span className="text-slate-400">+</span>
              <FlowChip>Soap</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 rotate-90 text-slate-400" />
              <FlowChip tone="warn">Soap Scum · Less Foam · More Soap Required</FlowChip>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-[13px] text-slate-700 leading-relaxed space-y-1.5">
          <p><span className="font-semibold text-slate-900">Diagram Explanation</span></p>
          <p>• In soft water, soap directly produces foam.</p>
          <p>• In hard water, calcium and magnesium ions first react with soap, reducing foam formation and making cleaning difficult.</p>
        </div>
      </Section>

      {/* 06 Causes of Hardness */}
      <Section number="06" title="Causes of Hardness" icon={BookOpen}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p className="text-[14px] text-slate-700">
              The hardness of water is mainly caused by dissolved salts of calcium and magnesium.
            </p>
          </div>
          <p>
            Water becomes hard when it contains dissolved compounds of calcium and magnesium. These compounds enter
            water naturally when it comes into contact with rocks and underground minerals.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-[13px] font-semibold text-slate-900 mb-2">Calcium Salts</p>
              <ul className="space-y-1 text-[13px] text-slate-700">
                <li>• Calcium bicarbonate</li>
                <li>• Calcium sulphate</li>
                <li>• Calcium chloride</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-[13px] font-semibold text-slate-900 mb-2">Magnesium Salts</p>
              <ul className="space-y-1 text-[13px] text-slate-700">
                <li>• Magnesium bicarbonate</li>
                <li>• Magnesium sulphate</li>
                <li>• Magnesium chloride</li>
              </ul>
            </div>
          </div>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-slate-900">Why these ions? </span>
              Calcium and magnesium ions react with soap to form an insoluble precipitate called soap scum, instead of producing lather. This reduces the cleaning efficiency of soap.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-2">Engineering Applications</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {['Reduces boiler efficiency', 'Causes scaling in pipes', 'Increases maintenance costs', 'Damages industrial equipment'].map((a) => (
                <div key={a} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{a}</div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-amber-800">Important Note · </span>
              Sodium and potassium salts do not cause hardness. Only calcium and magnesium salts are mainly responsible.
            </p>
          </div>
        </div>
      </Section>

      {/* 07 Types of Hardness */}
      <Section number="07" title="Types of Hardness" icon={ListChecks}>
        <p className="text-[13px] text-slate-600 mb-3">Hardness is classified into two types:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium text-slate-800 text-center">Temporary Hardness</div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium text-slate-800 text-center">Permanent Hardness</div>
        </div>
      </Section>

      {/* 08 Temporary Hardness */}
      <Section number="08" title="Temporary Hardness" icon={BookOpen}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p className="text-[14px] text-slate-700">
              Temporary hardness is the hardness caused by dissolved bicarbonates of calcium and magnesium.
            </p>
          </div>
          <p>
            It is called <span className="font-medium text-slate-900">temporary</span> because it can be removed simply by boiling.
            The bicarbonates become insoluble when heated and settle at the bottom — hardness disappears after boiling.
          </p>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-2">Salts Responsible</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {['Calcium bicarbonate [Ca(HCO₃)₂]', 'Magnesium bicarbonate [Mg(HCO₃)₂]'].map((s) => (
                <div key={s} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{s}</div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Real-Life Example</p>
            <p>When water is repeatedly boiled in a kettle, a white deposit often forms at the bottom — formed due to the removal of temporary hardness.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Visual Understanding</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
              <FlowChip>Temporary Hard Water</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Boiling</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Bicarbonates Removed</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip tone="warn">Soft Water</FlowChip>
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-amber-800">Important Note · </span>
              Temporary hardness can be removed by boiling — a frequently asked examination point.
            </p>
          </div>
        </div>
      </Section>

      {/* 09 Permanent Hardness */}
      <Section number="09" title="Permanent Hardness" icon={BookOpen}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p className="text-[14px] text-slate-700">
              Permanent hardness is the hardness caused by dissolved chlorides and sulphates of calcium and magnesium.
            </p>
          </div>
          <p>
            Unlike temporary hardness, permanent hardness cannot be removed by boiling. The salts responsible remain
            dissolved even at high temperatures, so special water treatment methods are required.
          </p>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-2">Salts Responsible</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {['Calcium sulphate (CaSO₄)', 'Magnesium sulphate (MgSO₄)', 'Calcium chloride (CaCl₂)', 'Magnesium chloride (MgCl₂)'].map((s) => (
                <div key={s} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-700 text-center">{s}</div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Real-Life Example</p>
            <p>Many industries use groundwater containing sulphates and chlorides. Even after boiling, the hardness remains unchanged — this is permanent hardness.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Visual Understanding</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
              <FlowChip>Permanent Hard Water</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Boiling</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>No Change</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip tone="warn">Still Hard Water</FlowChip>
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-amber-800">Important Note · </span>
              Permanent hardness requires chemical treatment such as the Lime-soda process, Zeolite process, or Ion-exchange process.
            </p>
          </div>
        </div>
      </Section>

      {/* 10 Comparison */}
      <Section number="10" title="Temporary vs Permanent Hardness" icon={GitCompare}>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Feature</th>
                <th className="text-left px-4 py-2.5 font-semibold">Temporary Hardness</th>
                <th className="text-left px-4 py-2.5 font-semibold">Permanent Hardness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                ['Cause', 'Bicarbonates', 'Sulphates and Chlorides'],
                ['Removed by Boiling', 'Yes', 'No'],
                ['Treatment Required', 'Simple', 'Advanced'],
                ['Common Salts', 'Ca(HCO₃)₂, Mg(HCO₃)₂', 'CaSO₄, MgSO₄, CaCl₂, MgCl₂'],
              ].map(([f, t, p]) => (
                <tr key={f} className="bg-white">
                  <td className="px-4 py-2.5 font-medium text-slate-900 align-top">{f}</td>
                  <td className="px-4 py-2.5 text-slate-600">{t}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 11 Expression of Hardness */}
      <Section number="11" title="Expression of Hardness" icon={Calculator}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p className="text-[14px] text-slate-700">
              Hardness is expressed in terms of the equivalent amount of calcium carbonate (CaCO₃).
            </p>
          </div>
          <p>
            Different salts produce different levels of hardness. To compare hardness values easily, all hardness-producing
            substances are converted into an equivalent amount of calcium carbonate.
          </p>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-slate-900">Why CaCO₃? </span>
              It has a known molecular weight, is stable, and simplifies calculations. Hardness is usually reported as
              <span className="font-medium"> mg/L as CaCO₃</span> or <span className="font-medium">ppm as CaCO₃</span>.
            </p>
          </div>
        </div>
      </Section>

      {/* 12 Units of Hardness */}
      <Section number="12" title="Units of Hardness" icon={Sigma}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-[13px] font-semibold text-slate-900 mb-1">Parts Per Million (ppm)</p>
              <p className="text-[13px] text-slate-700">Number of parts of hardness present in one million parts of water. If 1 L of water contains 1 mg of hardness-causing substance, hardness = 1 ppm.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-[13px] font-semibold text-slate-900 mb-1">Milligrams Per Litre (mg/L)</p>
              <p className="text-[13px] text-slate-700">Milligrams of dissolved hardness-causing substances present in one litre of water.</p>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4 text-center">
            <p className="text-[14px] font-semibold text-blue-800">1 ppm = 1 mg/L</p>
            <p className="text-[12px] text-slate-600 mt-1">A very important relationship for examinations.</p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Real-Life Example</p>
            <p>If a water sample contains 250 mg of calcium carbonate equivalent in one litre, hardness = 250 mg/L = 250 ppm.</p>
          </div>
        </div>
      </Section>

      {/* 13 EDTA Method */}
      <Section number="13" title="Estimation of Hardness by EDTA Method" icon={Building2}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p className="text-[14px] text-slate-700">
              The hardness of water is determined by a complexometric titration method using EDTA as the titrating agent.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">What is EDTA?</p>
            <p>EDTA stands for <span className="font-medium text-slate-900">Ethylene Diamine Tetra Acetic Acid</span>. It forms stable complexes with calcium and magnesium ions.</p>
          </div>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-slate-900">Principle · </span>
              EDTA reacts with Ca²⁺ and Mg²⁺ ions to form stable complexes. The volume of EDTA consumed is directly
              proportional to the hardness of water.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-2">Chemicals Used</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {[
                ['EDTA Solution', 'Titrating agent'],
                ['Buffer Solution', 'Maintains pH around 10'],
                ['Eriochrome Black-T (EBT)', 'Indicator'],
              ].map(([n, d]) => (
                <div key={n} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[12px] font-semibold text-slate-900">{n}</p>
                  <p className="text-[12px] text-slate-600 mt-0.5">{d}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-2">Working of the EDTA Method</p>
            <div className="space-y-2">
              {[
                'A measured volume of hard water is taken.',
                'Buffer solution is added to maintain pH.',
                'EBT indicator is then added — solution develops a wine-red colour.',
                'EDTA solution is slowly added from a burette.',
                'EDTA reacts with Ca²⁺ and Mg²⁺ ions and releases the indicator.',
                'At the end point, the colour changes from wine-red to blue.',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
                  <div className="h-6 w-6 shrink-0 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold flex items-center justify-center border border-blue-100">{i + 1}</div>
                  <p className="text-[13px] leading-relaxed pt-0.5 text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Visual Understanding</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
              <FlowChip>Hard Water</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Add Buffer</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Add EBT</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Wine Red</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Add EDTA</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip tone="warn">Blue (End Point)</FlowChip>
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-2">Real-Life Importance</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {['Monitor drinking water quality', 'Check industrial water quality', 'Control boiler water hardness', 'Maintain water treatment plants'].map((a) => (
                <div key={a} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{a}</div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-amber-800">Important Note · </span>
              Remember the colour change: <span className="font-semibold text-slate-900">Wine Red → Blue</span>. One of
              the most commonly asked questions in Engineering Chemistry examinations.
            </p>
          </div>
        </div>
      </Section>

      {/* 14 Topic Summary */}
      <Section number="14" title="Topic Summary" icon={FileText}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2 text-[14px] leading-relaxed text-slate-700">
          <ul className="space-y-1 pl-1">
            <li>• Hardness of water is caused mainly by dissolved calcium and magnesium salts.</li>
            <li>• <span className="font-medium text-slate-900">Temporary hardness</span> is caused by bicarbonates and can be removed by boiling.</li>
            <li>• <span className="font-medium text-slate-900">Permanent hardness</span> is caused by sulphates and chlorides and cannot be removed by boiling.</li>
            <li>• Hardness is expressed as calcium carbonate equivalent and is commonly measured in <span className="font-medium">ppm or mg/L</span>.</li>
            <li>• The <span className="font-medium text-slate-900">EDTA complexometric titration</span> is widely used for hardness estimation — colour changes from wine-red to blue at the end point.</li>
          </ul>
        </div>
      </Section>
    </>
  );
}

function FluorideManagementArticle() {
  return (
    <>
      {/* 01 Definition */}
      <Section number="01" title="Definition" icon={BookOpen}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2">
          <p className="text-[14px] leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Fluoride management</span> refers to the monitoring and control
            of fluoride concentration in water to ensure that it remains within
            <span className="font-medium text-blue-700"> safe limits</span> for human consumption.
          </p>
          <p className="text-[13px] text-slate-600">
            Fluoride is beneficial in small amounts, but excessive fluoride in drinking water can cause serious health
            problems. Therefore, it is important to maintain fluoride concentration within the recommended range.
          </p>
        </div>
      </Section>

      {/* 02 Understanding the Concept */}
      <Section number="02" title="Understanding the Concept" icon={Lightbulb}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>Fluoride is a naturally occurring mineral found in rocks, soil, groundwater, and some surface water sources.</p>
          <ul className="space-y-2">
            {[
              'When water flows through fluoride-containing rocks for long periods, fluoride dissolves into the water.',
              'In small amounts, fluoride helps strengthen teeth and prevents tooth decay.',
              'When fluoride concentration becomes too high, continuous consumption can affect teeth and bones.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{t}
              </li>
            ))}
          </ul>
          <p>
            This is why fluoride management is an important part of water quality control, especially in areas where
            groundwater is the primary source of drinking water.
          </p>
        </div>
      </Section>

      {/* 03 Why is Fluoride Management Important */}
      <Section number="03" title="Why is Fluoride Management Important?" icon={AlertTriangle}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>
            Fluoride behaves differently from many other water contaminants. A small amount is beneficial, but
            excessive amounts become harmful — fluoride cannot simply be classified as "good" or "bad."
            The key is maintaining the <span className="font-medium text-slate-900">correct concentration</span>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-[13px] font-semibold text-amber-900 mb-1">Below recommended level</p>
              <p className="text-[13px] text-slate-700">Teeth may become more susceptible to decay.</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
              <p className="text-[13px] font-semibold text-rose-900 mb-1">Above recommended level</p>
              <ul className="text-[13px] text-slate-700 space-y-0.5">
                <li>• Dental fluorosis may occur</li>
                <li>• Skeletal fluorosis may develop</li>
                <li>• Bone and joint problems may arise</li>
              </ul>
            </div>
          </div>
          <p className="text-[13px] text-slate-600">
            Therefore, engineers and water treatment authorities continuously monitor fluoride levels in drinking water.
          </p>
        </div>
      </Section>

      {/* 04 Real-Life Example */}
      <Section number="04" title="Real-Life Example" icon={Eye}>
        <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3 space-y-2 text-[13px] text-slate-700">
          <p>Many regions in India depend heavily on groundwater for drinking purposes.</p>
          <p>In some areas, groundwater passes through fluoride-rich geological formations, raising fluoride concentration far above the safe limit.</p>
          <p>People consuming such water for many years may develop visible white or brown stains on their teeth and, in severe cases, bone deformities.</p>
        </div>
      </Section>

      {/* 05 Visual Understanding */}
      <Section number="05" title="Visual Understanding" icon={Workflow}>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <FlowChip>Groundwater</FlowChip>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <FlowChip>Fluoride-Containing Rocks</FlowChip>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <FlowChip>Fluoride Dissolves</FlowChip>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <FlowChip>High Fluoride Water</FlowChip>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <FlowChip>Monitoring & Treatment</FlowChip>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <FlowChip tone="warn">Safe Drinking Water</FlowChip>
          </div>
          <p className="mt-4 text-[13px] text-slate-600 text-center">
            As groundwater moves through underground rock layers, fluoride dissolves into the water. The concentration is then monitored and reduced if necessary before supply.
          </p>
        </div>
      </Section>

      {/* 06 Safe Limits */}
      <Section number="06" title="Safe Limits of Fluoride in Drinking Water" icon={Calculator}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
            <p className="text-[12px] uppercase tracking-wide text-blue-700 font-semibold">Desirable Limit</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">1.0 <span className="text-base font-normal text-slate-600">mg/L</span></p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-[12px] uppercase tracking-wide text-amber-700 font-semibold">Maximum Permissible Limit</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">1.5 <span className="text-base font-normal text-slate-600">mg/L</span></p>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-slate-600">
          Water containing fluoride beyond the permissible limit requires treatment before consumption.
        </p>
      </Section>

      {/* 07 Why is Excess Fluoride Harmful */}
      <Section number="07" title="Why is Excess Fluoride Harmful?" icon={AlertTriangle}>
        <div className="space-y-2 text-[14px] leading-relaxed">
          <p>When fluoride enters the body continuously over many years, it begins accumulating in teeth and bones.</p>
          <p className="text-[13px] text-slate-600">
            Initially, the effects may appear minor — however, long-term exposure can lead to permanent health problems.
          </p>
        </div>
      </Section>

      {/* 08 Dental Fluorosis */}
      <Section number="08" title="Dental Fluorosis" icon={GitCompare}>
        <div className="space-y-3">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Definition</p>
            <p className="text-[13px] text-slate-700">
              Dental fluorosis is a condition caused by excessive fluoride intake during tooth development.
            </p>
          </div>
          <div className="space-y-2 text-[13px] text-slate-700">
            <p>The earliest sign of fluoride toxicity usually appears on teeth.</p>
            <ul className="space-y-1.5 pl-1">
              <li>• Initially, white streaks or spots appear on the tooth surface.</li>
              <li>• With prolonged exposure, stains may become yellow or brown.</li>
              <li>• In severe cases, enamel may become rough and damaged.</li>
            </ul>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <FlowChip>Normal Teeth</FlowChip>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <FlowChip>White Spots</FlowChip>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <FlowChip>Brown Stains</FlowChip>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <FlowChip tone="warn">Severe Dental Fluorosis</FlowChip>
            </div>
          </div>
        </div>
      </Section>

      {/* 09 Skeletal Fluorosis */}
      <Section number="09" title="Skeletal Fluorosis" icon={AlertTriangle}>
        <div className="space-y-3">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Definition</p>
            <p className="text-[13px] text-slate-700">
              Skeletal fluorosis is a bone disease caused by long-term consumption of water containing excessive fluoride.
            </p>
          </div>
          <p className="text-[13px] text-slate-700">
            Unlike dental fluorosis, skeletal fluorosis affects bones and joints. Fluoride gradually accumulates in bone
            tissues; over many years, bones become denser but less flexible.
          </p>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['Joint pain', 'Stiffness', 'Restricted movement', 'Bone deformities'].map((t) => (
              <li key={t} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-center text-slate-800">{t}</li>
            ))}
          </ul>
          <div className="rounded-lg border-l-2 border-amber-500 bg-amber-50/40 px-4 py-3 text-[13px] text-slate-700">
            <span className="font-semibold text-slate-900">Note: </span>
            Dental fluorosis usually appears first; skeletal fluorosis develops only after prolonged exposure to high fluoride concentrations.
          </div>
        </div>
      </Section>

      {/* 10 Defluoridation */}
      <Section number="10" title="Defluoridation" icon={Workflow}>
        <div className="space-y-3">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Definition</p>
            <p className="text-[13px] text-slate-700">
              Defluoridation is the process of removing excess fluoride from water to make it safe for drinking.
            </p>
          </div>
          <p className="text-[13px] text-slate-700">
            When fluoride concentration exceeds the safe limit, the water must be treated. The objective is not to remove
            all fluoride completely but to reduce it to a <span className="font-medium text-slate-900">safe level</span>.
          </p>
          <p className="text-[13px] text-slate-600">
            Without defluoridation, dental and skeletal fluorosis may occur and long-term health risks increase.
          </p>
        </div>
      </Section>

      {/* 11 Techniques of Defluoridation */}
      <Section number="11" title="Techniques of Defluoridation" icon={ListChecks}>
        <div className="space-y-4">
          {/* Nalgonda */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
            <p className="text-[13px] font-semibold text-slate-900">1. Nalgonda Technique</p>
            <p className="text-[13px] text-slate-700">
              Uses <span className="font-medium">alum, lime, and bleaching powder</span> to remove fluoride. Chemicals
              are added to water, fluoride associates with flocs, the flocs settle and are removed.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['Economical', 'Easy to operate', 'Suitable for communities', 'Effective for rural areas'].map((t) => (
                <div key={t} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-center text-slate-700">{t}</div>
              ))}
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mt-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <FlowChip>Fluoride Water</FlowChip>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <FlowChip>Add Alum + Lime</FlowChip>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <FlowChip>Floc Formation</FlowChip>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <FlowChip>Settling</FlowChip>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <FlowChip tone="warn">Reduced Fluoride Water</FlowChip>
              </div>
            </div>
          </div>

          {/* Activated Alumina */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
            <p className="text-[13px] font-semibold text-slate-900">2. Activated Alumina Method</p>
            <p className="text-[13px] text-slate-700">
              A porous material that adsorbs fluoride ions from water. Water is passed through a bed of activated alumina,
              and fluoride ions attach to its very large surface area through adsorption.
            </p>
            <p className="text-[12px] text-slate-600">
              <span className="font-medium text-slate-800">Applications: </span>
              Domestic filters, community plants, industrial purification.
            </p>
          </div>

          {/* Ion Exchange */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
            <p className="text-[13px] font-semibold text-slate-900">3. Ion Exchange Method</p>
            <p className="text-[13px] text-slate-700">
              Fluoride ions are removed by replacing them with other harmless ions using specialized resins. As water passes
              through the resin bed, fluoride ions are captured and other ions released.
            </p>
            <p className="text-[12px] text-slate-600">
              <span className="font-medium text-slate-800">Applications: </span>
              Advanced water treatment, industrial purification, high-quality drinking water plants.
            </p>
          </div>
        </div>
      </Section>

      {/* 12 Ion-Selective Electrode Method */}
      <Section number="12" title="Determination by Ion-Selective Electrode Method" icon={Calculator}>
        <div className="space-y-3">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Definition</p>
            <p className="text-[13px] text-slate-700">
              An analytical technique used to determine fluoride ion concentration in water using a fluoride-sensitive electrode.
            </p>
          </div>
          <p className="text-[13px] text-slate-700">
            The electrode is specially designed to respond only to fluoride ions. Because of this selectivity, accurate
            measurements can be obtained even when other ions are present.
          </p>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1.5">Advantages</p>
            <ul className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {['High accuracy', 'Fast results', 'Simple operation', 'Lab analysis', 'Field testing'].map((t) => (
                <li key={t} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-center text-slate-700">{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1.5">Principle</p>
            <p className="text-[13px] text-slate-700">
              The fluoride-sensitive electrode develops an electrical potential when in contact with fluoride ions. The
              magnitude of this potential depends on the fluoride concentration. The instrument converts this signal into
              a concentration value.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1.5">Working Procedure</p>
            <ol className="space-y-1.5 text-[13px] text-slate-700 list-decimal list-inside">
              <li>Collect a water sample.</li>
              <li>Immerse the fluoride ion-selective electrode in the sample.</li>
              <li>The electrode senses fluoride ions present in water.</li>
              <li>An electrical signal is generated.</li>
              <li>The meter converts the signal into a fluoride concentration.</li>
              <li>The fluoride level is displayed on the instrument.</li>
            </ol>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <FlowChip>Water Sample</FlowChip>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <FlowChip>Fluoride Electrode</FlowChip>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <FlowChip>Electrical Signal</FlowChip>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <FlowChip>Measurement Meter</FlowChip>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <FlowChip tone="warn">Fluoride Concentration</FlowChip>
            </div>
            <p className="mt-3 text-[12px] text-slate-600 text-center">
              The fluoride electrode detects only fluoride ions and converts their concentration into an electrical response that can be measured accurately.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1.5">Engineering Applications</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                'Drinking water laboratories',
                'Municipal water treatment plants',
                'Environmental monitoring',
                'Groundwater quality assessment',
                'Industrial water testing facilities',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border-l-2 border-blue-500 bg-blue-50/40 px-4 py-3 text-[13px] text-slate-700">
            <span className="font-semibold text-slate-900">Note: </span>
            The ion-selective electrode method is preferred because it provides rapid and reliable results.
          </div>
        </div>
      </Section>

      {/* 13 Topic Summary */}
      <Section number="13" title="Topic Summary" icon={FileText}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2 text-[14px] leading-relaxed text-slate-700">
          <p>
            Fluoride is a naturally occurring mineral. Small amounts are beneficial for dental health, but excessive
            fluoride causes <span className="font-medium text-slate-900">dental and skeletal fluorosis</span>.
          </p>
          <p>The process of reducing excess fluoride is called <span className="font-medium text-slate-900">defluoridation</span>. Common methods include:</p>
          <ul className="space-y-1 pl-1">
            <li>• <span className="font-medium text-slate-900">Nalgonda Technique</span></li>
            <li>• <span className="font-medium text-slate-900">Activated Alumina Method</span></li>
            <li>• <span className="font-medium text-slate-900">Ion Exchange Method</span></li>
          </ul>
          <p>
            Fluoride concentration is commonly determined using the
            <span className="font-medium text-slate-900"> ion-selective electrode method</span>, which measures fluoride
            ions accurately. Proper fluoride management ensures safe drinking water and protects public health.
          </p>
        </div>
      </Section>
    </>
  );
}


function WaterSofteningArticle() {
  return (
    <>
      {/* 01 Definition */}
      <Section number="01" title="Definition" icon={BookOpen}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2">
          <p className="text-[14px] leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Water softening</span> is the process of removing or reducing
            hardness-causing ions, mainly <span className="font-medium text-blue-700">calcium (Ca²⁺)</span> and
            <span className="font-medium text-blue-700"> magnesium (Mg²⁺)</span>, from water.
          </p>
          <p className="text-[13px] text-slate-600">
            The main objective of water softening is to prevent scale formation, improve the efficiency of industrial
            equipment, and make water suitable for domestic and industrial use.
          </p>
        </div>
      </Section>

      {/* 02 Understanding the Concept */}
      <Section number="02" title="Understanding the Concept" icon={Lightbulb}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>In the previous topic, we learned that hard water contains dissolved calcium and magnesium salts.</p>
          <ul className="space-y-2">
            {[
              'When hard water is used in boilers, heat exchangers, pipelines, and industrial equipment, these salts can form hard deposits called scales.',
              'These deposits reduce heat transfer efficiency, increase fuel consumption, and may even damage equipment.',
              'To avoid these problems, hardness-causing ions must be removed or controlled.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{t}
              </li>
            ))}
          </ul>
          <p>This process is known as <span className="font-medium text-slate-900">water softening</span>.</p>
        </div>
      </Section>

      {/* 03 Why is Water Softening Necessary */}
      <Section number="03" title="Why is Water Softening Necessary?" icon={AlertTriangle}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>
            Imagine boiling milk in a clean vessel every day without washing it properly. After a few days, a thick
            layer starts forming on the vessel walls.
          </p>
          <p>
            Similarly, when hard water is repeatedly heated inside industrial equipment, calcium and magnesium salts
            form hard deposits. Over time, these deposits become thicker and create operational problems.
          </p>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-slate-900">Outcome · </span>
              Water softening helps prevent these issues and increases the life of equipment.
            </p>
          </div>
        </div>
      </Section>

      {/* 04 Real-Life Example */}
      <Section number="04" title="Real-Life Example" icon={MessageSquareQuote}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>Many households use water purifiers or softeners when borewell water contains excessive hardness.</p>
          <p className="text-[13px] font-semibold text-slate-900">Without treatment:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              'Soap consumption increases.',
              'Water heaters become less efficient.',
              'White deposits appear on taps and bathroom fittings.',
            ].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{t}</div>
            ))}
          </div>
          <p>Softening reduces these problems and improves water quality.</p>
        </div>
      </Section>

      {/* 05 Visual Understanding */}
      <Section number="05" title="Visual Understanding" icon={Workflow}>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Softening Flow</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
            <FlowChip>Hard Water</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip>Ca²⁺ + Mg²⁺ Ions</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip>Water Softening</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip>Reduced Hardness</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip tone="warn">Soft Water</FlowChip>
          </div>
          <p className="text-[12px] text-slate-500 mt-3 text-center">
            Hardness-causing calcium and magnesium ions are removed or controlled, resulting in soft water.
          </p>
        </div>
      </Section>

      {/* 06 Methods Overview */}
      <Section number="06" title="Methods of Water Softening" icon={GitCompare}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
            <p className="font-semibold text-blue-800 mb-1">Internal Conditioning</p>
            <p className="text-slate-700">Chemicals added inside the boiler to convert hardness salts into harmless forms.</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
            <p className="font-semibold text-blue-800 mb-1">External Treatment</p>
            <p className="text-slate-700">Hardness-causing ions are removed before water enters the boiler.</p>
          </div>
        </div>
      </Section>

      {/* 07 Internal Conditioning */}
      <Section number="07" title="Internal Conditioning" icon={Building2}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p className="text-slate-700">
              Internal conditioning is the process of treating water <span className="font-medium text-slate-900">inside the boiler</span>
              {' '}so that hardness-causing impurities do not form hard scales. Instead of removing impurities completely,
              chemicals are added to convert them into harmless substances that remain suspended in water.
            </p>
          </div>
          <p>
            Sometimes it is difficult or expensive to remove all hardness before water enters the boiler. In such
            situations, special chemicals are added directly inside the boiler. These react with hardness-causing salts
            and prevent them from forming hard deposits.
          </p>
          <p className="text-[13px] font-semibold text-slate-900">As a result:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {['Scale formation is reduced.', 'Boiler operation becomes safer.', 'Cleaning becomes easier.'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{t}</div>
            ))}
          </div>
          <p className="text-[13px] font-semibold text-slate-900 pt-1">Why is Internal Conditioning Used?</p>
          <ul className="space-y-2">
            {[
              'Residual hardness remains in boiler water.',
              'Additional protection is required.',
              'Continuous scale prevention is needed.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{t}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 08 Calgon Conditioning */}
      <Section number="08" title="Calgon Conditioning" icon={Sigma}>
        <StageBlock
          definition="Calgon conditioning is an internal conditioning method in which Calgon (Sodium Hexametaphosphate, (NaPO₃)₆) is added to boiler water to prevent scale formation."
          concept="When hard water enters a boiler, calcium and magnesium ions are present. Normally, these ions form hard scales on boiler surfaces. Calgon prevents this by combining with calcium ions to form a soluble complex. Since the complex remains dissolved in water, scale formation is prevented."
          reason="Calgon acts like a protective shield around calcium ions. The calcium ions remain trapped in a soluble form and cannot form hard deposits."
          example="Imagine tying several objects together inside a net. Since they are trapped inside the net, they cannot move freely. Similarly, calcium ions become trapped within the Calgon complex and cannot form scales."
          flow={['Ca²⁺ Ions', 'Add Calgon', 'Soluble Complex', 'No Scale Formation']}
          applications={['Industrial boilers', 'Power plants', 'Steam generation systems']}
          note="Calgon does not remove hardness ions completely. It only prevents them from forming scales."
        />
      </Section>

      {/* 09 Phosphate Conditioning */}
      <Section number="09" title="Phosphate Conditioning" icon={Sigma}>
        <StageBlock
          definition="Phosphate conditioning is an internal conditioning method in which sodium phosphate is added to boiler water to convert hardness-causing salts into soft sludge."
          concept="In this method, phosphate compounds react with calcium and magnesium ions. The reaction produces soft, non-adherent sludge instead of hard scales. This sludge can be removed easily through blowdown operations."
          reason="Calcium and magnesium ions react with phosphate ions and form insoluble phosphates. Unlike scales, these phosphates remain as loose sludge."
          example="Think of wet sand and dry cement. Wet sand can be removed easily, whereas hardened cement is difficult to remove. Similarly, phosphate conditioning converts scale-forming salts into removable sludge."
          flow={['Ca²⁺ + Mg²⁺', 'Add Sodium Phosphate', 'Soft Sludge Formation', 'Removed by Blowdown']}
          applications={['High-pressure boilers', 'Thermal power plants', 'Industrial steam systems']}
          note="The sludge formed should be removed regularly to maintain boiler efficiency."
        />
      </Section>

      {/* 10 Colloidal Conditioning */}
      <Section number="10" title="Colloidal Conditioning" icon={Sigma}>
        <StageBlock
          definition="Colloidal conditioning is an internal conditioning method in which substances such as kerosene, tannin, starch, or agar-agar are added to boiler water to prevent scale formation."
          concept="These colloidal substances surround hardness particles and keep them suspended in water. As a result, the particles do not stick to boiler walls and do not form scales. The suspended particles can later be removed through blowdown."
          reason="The colloidal material creates a protective layer around the particles. This prevents the particles from settling and attaching to metal surfaces."
          example="When dust particles remain floating in air, they do not stick immediately to a surface. Similarly, colloidal conditioning keeps hardness particles suspended in water."
          flow={['Hardness Particles', 'Add Colloidal Substance', 'Particles Remain Suspended', 'No Scale Formation']}
          applications={['Low-pressure boilers', 'Small industrial steam systems']}
          note="Colloidal conditioning is generally used for low-pressure boiler operations."
        />
      </Section>

      {/* 11 External Treatment */}
      <Section number="11" title="External Treatment" icon={Building2}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p className="text-slate-700">
              External treatment is the process of removing hardness-causing ions from water
              <span className="font-medium text-slate-900"> before it enters the boiler</span> or industrial system.
            </p>
          </div>
          <p>
            Unlike internal conditioning, external treatment removes calcium and magnesium ions before the water is
            used. As a result, the water entering the boiler already has very low hardness, providing better protection
            and reducing maintenance requirements.
          </p>
          <p className="text-[13px] font-semibold text-slate-900">Why is External Treatment Preferred?</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {['Scale formation is minimized.', 'Boiler efficiency increases.', 'Equipment life improves.'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{t}</div>
            ))}
          </div>
        </div>
      </Section>

      {/* 12 Ion-Exchange Process */}
      <Section number="12" title="Ion-Exchange Process" icon={Network}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p className="text-slate-700">
              The ion-exchange process is an external water treatment method in which hardness-causing ions are
              exchanged with harmless ions using <span className="font-medium text-slate-900">ion-exchange resins</span>.
            </p>
          </div>
          <p>
            This is one of the most effective methods of water softening. Special materials called resins are used,
            which have the ability to exchange ions. As hard water passes through the resin bed:
          </p>
          <ul className="space-y-2">
            {[
              'Calcium ions are removed.',
              'Magnesium ions are removed.',
              'Hydrogen or sodium ions are released.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{t}
              </li>
            ))}
          </ul>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-slate-900">Why does it work? </span>
              The resin contains ions that can easily be exchanged. The hardness ions present in water have a stronger
              attraction toward the resin, so calcium and magnesium ions become attached to the resin while harmless
              ions enter the water.
            </p>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-2">Step-by-Step Working</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[
                { s: 'Step 1', t: 'Hard water enters the ion-exchange unit.' },
                { s: 'Step 2', t: 'Calcium and magnesium ions are captured by the resin.' },
                { s: 'Step 3', t: 'Hydrogen or sodium ions are released.' },
                { s: 'Step 4', t: 'Soft water leaves the system.' },
              ].map((x) => (
                <div key={x.s} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-mono text-blue-700 font-semibold">{x.s}</p>
                  <p className="text-[13px] text-slate-700 mt-0.5">{x.t}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Visual Understanding</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
              <FlowChip>Hard Water</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Ion Exchange Resin</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Ca²⁺ and Mg²⁺ Removed</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip tone="warn">Soft Water</FlowChip>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-2">Engineering Applications</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {[
                'Power plants',
                'Pharmaceutical industries',
                'Chemical industries',
                'Boiler feed water treatment plants',
                'Water purification systems',
              ].map((a) => (
                <div key={a} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{a}</div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-amber-800">Important Note · </span>
              The ion-exchange process can remove both temporary and permanent hardness and is considered one of the
              most effective water-softening methods.
            </p>
          </div>
        </div>
      </Section>

      {/* 13 Topic Summary */}
      <Section number="13" title="Topic Summary" icon={FileText}>
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-5 space-y-2.5 text-[13.5px] leading-relaxed text-slate-700">
          <p>Water softening is the process of reducing or removing calcium and magnesium ions responsible for hardness.</p>
          <p><span className="font-semibold text-slate-900">Internal conditioning</span> prevents scale formation inside boilers and includes:</p>
          <ul className="ml-4 space-y-1 text-[13px]">
            <li>• Calgon Conditioning</li>
            <li>• Phosphate Conditioning</li>
            <li>• Colloidal Conditioning</li>
          </ul>
          <p><span className="font-semibold text-slate-900">External treatment</span> removes hardness before water enters the system.</p>
          <p>
            The most important external treatment method is the
            <span className="font-medium text-blue-700"> Ion-Exchange Process</span>, which removes hardness-causing
            ions using ion-exchange resins and produces soft water suitable for industrial applications.
          </p>
        </div>
      </Section>
    </>
  );
}

function DesalinationArticle() {
  return (
    <>
      {/* 01 Definition */}
      <Section number="01" title="Definition" icon={BookOpen}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2">
          <p className="text-[14px] leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Desalination</span> is the process of removing dissolved
            salts and minerals from saline water to obtain fresh water suitable for drinking, industrial use, and
            other applications.
          </p>
          <p className="text-[13px] text-slate-600">
            The word desalination literally means <span className="italic">"removal of salt."</span>
          </p>
        </div>
      </Section>

      {/* 02 Understanding the Concept */}
      <Section number="02" title="Understanding the Concept" icon={Lightbulb}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>
            More than <span className="font-semibold text-slate-900">70% of the Earth's surface</span> is covered with
            water. However, most of this water is present in oceans and seas.
          </p>
          <p>
            Although seawater is available in huge quantities, it cannot be used directly for drinking because it
            contains large amounts of dissolved salts.
          </p>
          <p className="text-[13px] font-semibold text-slate-900">If a person drinks seawater:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {['Excess salt enters the body.', 'Dehydration may occur.', 'Health problems can develop.'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{t}</div>
            ))}
          </div>
          <p>
            Therefore, seawater must be treated to remove dissolved salts before it can be used as drinking water.
            The process used for this purpose is called <span className="font-medium text-slate-900">desalination</span>.
          </p>
        </div>
      </Section>

      {/* 03 Why is Desalination Important */}
      <Section number="03" title="Why is Desalination Important?" icon={AlertTriangle}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <ul className="space-y-2">
            {[
              'Many regions around the world face freshwater shortages.',
              'Some coastal areas have plenty of seawater but very limited freshwater resources.',
              'Instead of transporting water over long distances, desalination plants convert seawater into usable freshwater.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{t}
              </li>
            ))}
          </ul>
          <p className="text-[13px] font-semibold text-slate-900">This helps:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {['Supply drinking water to cities.', 'Support industries.', 'Reduce dependence on groundwater.', 'Address water scarcity problems.'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{t}</div>
            ))}
          </div>
        </div>
      </Section>

      {/* 04 Real-Life Example */}
      <Section number="04" title="Real-Life Example" icon={MessageSquareQuote}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>
            Countries such as <span className="font-medium text-slate-900">Saudi Arabia</span>,
            <span className="font-medium text-slate-900"> United Arab Emirates</span>, and
            <span className="font-medium text-slate-900"> Israel</span> operate large desalination plants because
            freshwater resources are limited.
          </p>
          <p>Many coastal cities depend heavily on desalinated water for their daily needs.</p>
        </div>
      </Section>

      {/* 05 Visual Understanding */}
      <Section number="05" title="Visual Understanding" icon={Workflow}>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Desalination Flow</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
            <FlowChip>Sea Water</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip>Desalination Plant</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip>Removal of Dissolved Salts</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip tone="warn">Fresh Water</FlowChip>
          </div>
          <p className="text-[12px] text-slate-500 mt-3 text-center">
            Seawater enters the desalination system. Dissolved salts are removed, producing freshwater suitable for
            consumption and industrial use.
          </p>
        </div>
      </Section>

      {/* 06 Reverse Osmosis */}
      <Section number="06" title="Reverse Osmosis (RO)" icon={Network}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p className="text-slate-700">
              Reverse Osmosis (RO) is a desalination process in which pressure greater than the osmotic pressure is
              applied to force water through a <span className="font-medium text-slate-900">semi-permeable membrane</span>,
              leaving dissolved salts behind.
            </p>
          </div>
          <p>It is one of the most widely used desalination techniques in the world.</p>
        </div>
      </Section>

      {/* 07 Osmosis */}
      <Section number="07" title="Osmosis (Background)" icon={Lightbulb}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p className="text-slate-700">
              Osmosis is the movement of water molecules from a dilute solution to a concentrated solution through a
              semi-permeable membrane.
            </p>
          </div>
          <p>Imagine two containers separated by a special membrane.</p>
          <ul className="space-y-2">
            {[
              'One side contains pure water.',
              'The other side contains salt water.',
              'The membrane allows only water molecules to pass through and blocks salt molecules.',
              'Water naturally moves from the pure water side toward the salt water side.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{t}
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Natural Flow (Osmosis)</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
              <FlowChip>Pure Water</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Semi-Permeable Membrane</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Salt Water</FlowChip>
            </div>
            <p className="text-[12px] text-slate-500 mt-3 text-center">
              Water moves naturally from the dilute side to the concentrated side through the membrane.
            </p>
          </div>
        </div>
      </Section>

      {/* 08 Reverse Osmosis Concept */}
      <Section number="08" title="Reverse Osmosis — Concept" icon={GitCompare}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>Now imagine we apply high pressure on the saltwater side.</p>
          <p>This pressure forces water molecules to move in the opposite direction.</p>
          <p>
            Instead of moving toward the concentrated solution, water is pushed through the membrane while salts
            remain behind. This reverse movement is called <span className="font-medium text-slate-900">reverse osmosis</span>.
          </p>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-slate-900">Why does it work? </span>
              The semi-permeable membrane has extremely tiny pores that allow water molecules but block dissolved
              salts, bacteria, viruses, and suspended particles.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="font-semibold text-emerald-800 mb-1.5 text-[13px]">✓ Allowed Through</p>
              <ul className="text-[13px] text-slate-700 space-y-1">
                <li>• Water molecules</li>
              </ul>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
              <p className="font-semibold text-rose-800 mb-1.5 text-[13px]">✗ Blocked</p>
              <ul className="text-[13px] text-slate-700 space-y-1">
                <li>• Dissolved salts</li>
                <li>• Bacteria</li>
                <li>• Viruses</li>
                <li>• Suspended particles</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* 09 Real-Life RO Example */}
      <Section number="09" title="Real-Life Example" icon={MessageSquareQuote}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>The water purifiers used in many homes today operate using the reverse osmosis principle.</p>
          <p className="text-[13px] font-semibold text-slate-900">When water enters the purifier:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {['Salts are removed.', 'Harmful impurities are filtered.', 'Clean drinking water is produced.'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{t}</div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Reverse Osmosis Flow</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
              <FlowChip>High Pressure</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Salt Water</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Semi-Permeable Membrane</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip tone="warn">Pure Water</FlowChip>
            </div>
            <p className="text-[12px] text-slate-500 mt-3 text-center">
              Pressure forces water through the membrane. Salt ions cannot pass through and remain on the feed side.
            </p>
          </div>
        </div>
      </Section>

      {/* 10 Step-by-Step Working */}
      <Section number="10" title="Step-by-Step Working of Reverse Osmosis" icon={Workflow}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {[
            { s: 'Step 1', t: 'Saline water enters the RO system.' },
            { s: 'Step 2', t: 'High pressure is applied.' },
            { s: 'Step 3', t: 'Water molecules pass through the membrane.' },
            { s: 'Step 4', t: 'Dissolved salts remain behind.' },
            { s: 'Step 5', t: 'Freshwater is collected.' },
            { s: 'Step 6', t: 'Concentrated salt solution is discarded.' },
          ].map((x) => (
            <div key={x.s} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-mono text-blue-700 font-semibold">{x.s}</p>
              <p className="text-[13px] text-slate-700 mt-0.5">{x.t}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 11 Advantages */}
      <Section number="11" title="Advantages of Reverse Osmosis" icon={ListChecks}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          {[
            { t: 'Produces High-Quality Water', d: 'RO removes a large percentage of dissolved salts.' },
            { t: 'Removes Multiple Impurities', d: 'Removes salts, bacteria, viruses, and suspended particles.' },
            { t: 'Compact Design', d: 'RO systems can be installed in homes and industries.' },
            { t: 'Low Chemical Requirement', d: 'The process mainly depends on pressure and membrane separation.' },
          ].map((x) => (
            <div key={x.t} className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
              <p className="font-semibold text-blue-800 mb-1">{x.t}</p>
              <p className="text-slate-700">{x.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 12 Applications */}
      <Section number="12" title="Applications of Reverse Osmosis" icon={Building2}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {[
            'Drinking water purification',
            'Desalination plants',
            'Pharmaceutical industries',
            'Food processing industries',
            'Hospitals',
            'Power plants',
          ].map((a) => (
            <div key={a} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{a}</div>
          ))}
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 mt-3">
          <p className="text-[13px] text-slate-700">
            <span className="font-semibold text-amber-800">Important Note · </span>
            The semi-permeable membrane is the heart of an RO system. Without the membrane, separation of water and
            dissolved salts is not possible.
          </p>
        </div>
      </Section>

      {/* 13 Numerical Problems Intro */}
      <Section number="13" title="Numerical Problems Related to Water Hardness" icon={Calculator}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>
            In Engineering Chemistry examinations, numerical problems on hardness are frequently asked.
            Students are often required to:
          </p>
          <ul className="space-y-2">
            {[
              'Convert hardness values into CaCO₃ equivalents.',
              'Calculate total hardness.',
              'Convert between ppm and mg/L.',
              'Determine hardness using EDTA titration data.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{t}
              </li>
            ))}
          </ul>
          <p>Understanding the basic formulas makes these calculations very simple.</p>
        </div>
      </Section>

      {/* 14 Formula 1 */}
      <Section number="14" title="Formula 1 — ppm and mg/L" icon={Sigma}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-[13px] text-center">
            1 ppm = 1 mg/L
          </div>
          <p>For dilute water solutions: 1 milligram of impurity present in 1 litre of water is equal to 1 ppm.</p>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-700 mb-1">Example 1</p>
            <p className="text-[13px] text-slate-700">A water sample contains 300 mg/L hardness. Find its hardness in ppm.</p>
            <p className="text-[13px] text-slate-700 mt-2"><span className="font-semibold">Solution: </span>Since 1 mg/L = 1 ppm, therefore 300 mg/L = 300 ppm.</p>
            <p className="text-[13px] text-emerald-700 font-semibold mt-1">Answer: Hardness = 300 ppm</p>
          </div>
        </div>
      </Section>

      {/* 15 Formula 2 */}
      <Section number="15" title="Formula 2 — Hardness as CaCO₃" icon={Sigma}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-[13px] text-center">
            Hardness as CaCO₃ = (Amount of substance × 50) ÷ Equivalent Weight
          </div>
          <p>
            Different salts have different molecular weights. To compare hardness values easily, all
            hardness-producing substances are converted into their calcium carbonate equivalents.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-700 mb-1">Example 2</p>
            <p className="text-[13px] text-slate-700">
              A water sample contains 111 mg/L of CaCl₂. Equivalent weight of CaCl₂ = 55.5. Calculate hardness as CaCO₃.
            </p>
            <p className="text-[13px] text-slate-700 mt-2">
              <span className="font-semibold">Calculation: </span>(111 × 50) ÷ 55.5 = 100 mg/L
            </p>
            <p className="text-[13px] text-emerald-700 font-semibold mt-1">Answer: Hardness = 100 mg/L as CaCO₃</p>
          </div>
        </div>
      </Section>

      {/* 16 Formula 3 */}
      <Section number="16" title="Formula 3 — Total Hardness" icon={Sigma}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-[13px] text-center">
            Total Hardness = Temporary Hardness + Permanent Hardness
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-700 mb-1">Example 3</p>
            <p className="text-[13px] text-slate-700">Temporary Hardness = 180 ppm; Permanent Hardness = 220 ppm.</p>
            <p className="text-[13px] text-slate-700 mt-2"><span className="font-semibold">Solution: </span>180 + 220 = 400 ppm.</p>
            <p className="text-[13px] text-emerald-700 font-semibold mt-1">Answer: Total Hardness = 400 ppm</p>
          </div>
        </div>
      </Section>

      {/* 17 Formula 4 */}
      <Section number="17" title="Formula 4 — EDTA Method" icon={Sigma}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-[13px] text-center">
            Hardness (mg/L) = (Volume of EDTA × EDTA Factor × 1000) ÷ Volume of Water Sample
          </div>
          <p>
            The amount of EDTA consumed is directly proportional to the hardness of water. More EDTA consumption
            means greater hardness.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-700 mb-1">Example 4</p>
            <p className="text-[13px] text-slate-700">
              Volume of EDTA used = 15 mL; EDTA Factor = 1 mg CaCO₃/mL; Water Sample = 50 mL. Find hardness.
            </p>
            <p className="text-[13px] text-slate-700 mt-2">
              <span className="font-semibold">Solution: </span>(15 × 1 × 1000) ÷ 50 = 300 mg/L.
            </p>
            <p className="text-[13px] text-emerald-700 font-semibold mt-1">Answer: Hardness = 300 mg/L</p>
          </div>
        </div>
      </Section>

      {/* 18 Engineering Applications */}
      <Section number="18" title="Engineering Applications" icon={Building2}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>Hardness calculations are important in:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {[
              'Water treatment plants',
              'Boiler water analysis',
              'Industrial quality control laboratories',
              'Municipal water supply systems',
              'Environmental monitoring',
            ].map((a) => (
              <div key={a} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{a}</div>
            ))}
          </div>
          <p>Engineers use these calculations to determine whether water requires further treatment before use.</p>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-amber-800">Important Note · </span>
              Students often memorize formulas without understanding the units. Always check mg/L, ppm, mL, and
              CaCO₃ equivalent before performing calculations.
            </p>
          </div>
        </div>
      </Section>

      {/* 19 Topic Summary */}
      <Section number="19" title="Topic Summary" icon={FileText}>
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-5 space-y-2.5 text-[13.5px] leading-relaxed text-slate-700">
          <p>Desalination is the process of removing dissolved salts from saline water to produce freshwater.</p>
          <p>
            The most important desalination technique is <span className="font-medium text-blue-700">Reverse Osmosis (RO)</span>,
            which uses high pressure and a semi-permeable membrane to separate water from dissolved salts.
          </p>
          <p className="font-semibold text-slate-900">Numerical problems related to water hardness commonly involve:</p>
          <ul className="ml-4 space-y-1 text-[13px]">
            <li>• Conversion between ppm and mg/L</li>
            <li>• Hardness as CaCO₃</li>
            <li>• Total hardness calculations</li>
            <li>• EDTA titration calculations</li>
          </ul>
          <p>
            Understanding the formulas and their applications helps engineers evaluate water quality and design
            effective water treatment systems.
          </p>
        </div>
      </Section>
    </>
  );
}


function BoilerTroublesArticle() {
  return (
    <>
      {/* 01 Definition */}
      <Section number="01" title="Definition" icon={BookOpen}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2">
          <p className="text-[14px] leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Boiler troubles</span> are undesirable problems that occur
            inside a boiler due to impurities present in water. They reduce boiler efficiency, increase maintenance
            costs, damage equipment, and may even lead to boiler failure.
          </p>
          <p className="text-[13px] text-slate-600">The most common internal boiler troubles are:</p>
          <ul className="ml-4 space-y-1 text-[13px] text-slate-700">
            <li>• Sludge Formation</li>
            <li>• Scale Formation</li>
            <li>• Boiler Corrosion</li>
            <li>• Caustic Embrittlement</li>
          </ul>
        </div>
      </Section>

      {/* 02 Understanding the Concept */}
      <Section number="02" title="Understanding the Concept" icon={Lightbulb}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>
            A boiler is one of the most important pieces of equipment in industries, power plants, chemical factories,
            and manufacturing units. Its main function is to <span className="font-semibold text-slate-900">convert water
            into steam</span> by supplying heat.
          </p>
          <p>
            However, if untreated or poorly treated water is used, impurities present in the water begin to create
            problems inside the boiler. At first, these problems may appear minor. Over time, they can reduce heat
            transfer, waste fuel, damage metal surfaces, and even cause dangerous boiler accidents.
          </p>
          <p>Therefore, understanding boiler troubles is important for every engineer working with steam generation systems.</p>
        </div>
      </Section>

      {/* 03 Why Do Boiler Troubles Occur */}
      <Section number="03" title="Why Do Boiler Troubles Occur?" icon={AlertTriangle}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>Water naturally contains:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {['Dissolved salts', 'Dissolved gases', 'Suspended impurities', 'Minerals'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] text-slate-700 text-center">{t}</div>
            ))}
          </div>
          <p>
            When water is continuously heated and converted into steam, these impurities remain behind inside the
            boiler. As their concentration increases, various operational problems begin to develop.
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Visual Understanding</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
              <FlowChip>Impure Water</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Boiler Operation</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Accumulation of Impurities</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip tone="warn">Boiler Troubles</FlowChip>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
              {['Sludge Formation', 'Scale Formation', 'Corrosion', 'Caustic Embrittlement'].map((t) => (
                <div key={t} className="rounded-md border border-amber-200 bg-amber-50/60 text-amber-900 px-2.5 py-1.5 text-center">{t}</div>
              ))}
            </div>
          </div>
          <p className="text-[13px] text-slate-600">
            <span className="font-semibold text-slate-900">Diagram Explanation: </span>
            As water evaporates inside the boiler, impurities accumulate and create different types of internal boiler problems.
          </p>
        </div>
      </Section>

      {/* 04 Sludge Formation */}
      <Section number="04" title="Sludge Formation" icon={Workflow}>
        <StageBlock
          definition="Sludge is a soft, loose, slimy, and non-adherent deposit formed inside a boiler due to the accumulation of impurities that have low solubility in hot water."
          concept="Some dissolved salts become less soluble as the temperature of water increases. These salts do not stick strongly to the boiler surface; instead, they settle in cooler regions of the boiler and form a soft deposit known as sludge. Unlike scales, sludge is loose and can usually be removed more easily."
          reason="Sludge is generally formed due to salts such as Magnesium chloride (MgCl₂), Magnesium sulphate (MgSO₄), and Calcium chloride (CaCl₂), which tend to remain suspended and eventually settle as soft deposits."
          example="Imagine a cup of tea left undisturbed for some time — small particles gradually settle at the bottom. Similarly, dissolved impurities settle inside the boiler and form sludge deposits."
          flow={['Boiler Water', 'Impurities Present', 'Heating', 'Soft Deposits Form', 'Sludge']}
          applications={[
            'Reduced heat transfer efficiency',
            'Blockage of water circulation',
            'Reduced steam generation',
            'Increased fuel consumption',
          ]}
          note="Sludge is soft and non-adherent, making it easier to remove than scales. Prevention: proper water treatment, regular blowdown operations, and periodic boiler cleaning."
        />
      </Section>

      {/* 05 Scale Formation */}
      <Section number="05" title="Scale Formation" icon={GitCompare}>
        <StageBlock
          definition="Scales are hard, dense, adherent deposits formed on the inner surfaces of a boiler due to the precipitation of dissolved salts during heating."
          concept="When hard water is continuously heated inside a boiler, certain dissolved salts become insoluble and deposit directly on the boiler walls. These deposits gradually harden and form a thick layer called scale. Unlike sludge, scales strongly adhere to metal surfaces and are very difficult to remove."
          reason="As water evaporates, salt concentration increases, solubility of some salts decreases, insoluble compounds precipitate and attach firmly to boiler surfaces. Common scale-forming substances include Calcium Carbonate, Calcium Sulphate, Magnesium Hydroxide, and Silica deposits."
          example="When water is repeatedly boiled in a kettle, a hard white layer appears inside the vessel. The same process occurs inside industrial boilers, but on a much larger scale."
          visualTitle="Visual Understanding — Scale on Boiler Surface"
          visualBefore={['Boiler Surface', 'Clean Metal', 'Direct Heat Flow', 'Efficient Water Heating']}
          visualAfter={['Boiler Surface', 'Scale Layer (insulating)', 'Reduced Heat Flow ↓', 'Inefficient Heating']}
          applications={[
            'Reduced heat transfer',
            'Fuel wastage',
            'Overheating of boiler metal',
            'Risk of boiler failure',
            'Reduced boiler efficiency',
          ]}
          note="Scales are harder, denser, and much more dangerous than sludge deposits. Prevention: water softening before boiler use, internal conditioning methods, and regular maintenance."
        />
      </Section>

      {/* 06 Boiler Corrosion */}
      <Section number="06" title="Boiler Corrosion" icon={AlertTriangle}>
        <StageBlock
          definition="Boiler corrosion is the gradual destruction of boiler metal due to chemical or electrochemical reactions between the metal and corrosive substances present in water."
          concept="A boiler is constantly exposed to hot water and steam. If corrosive substances are present, they slowly attack the metal surface. Over time, the metal becomes thinner and weaker. If corrosion continues unchecked, leakage or equipment failure may occur."
          reason="Corrosion is mainly caused by dissolved oxygen (which reacts with iron to form rust), dissolved carbon dioxide (which forms carbonic acid attacking the metal), and acids formed inside the boiler."
          example="A bicycle left outside during the rainy season develops rust over time. The same process occurs inside boilers when oxygen is present."
          flow={['Boiler Metal', 'Oxygen / CO₂', 'Corrosion Begins', 'Rust Formation', 'Metal Damage']}
          applications={[
            'Metal thinning',
            'Leakage',
            'Reduced boiler life',
            'Increased maintenance cost',
            'Risk of equipment failure',
          ]}
          note="Even a small amount of dissolved oxygen can cause significant corrosion over time. Prevention: removal of dissolved oxygen, proper water treatment, use of corrosion inhibitors, and maintaining correct pH."
        />
      </Section>

      {/* 07 Caustic Embrittlement */}
      <Section number="07" title="Caustic Embrittlement" icon={Zap}>
        <StageBlock
          definition="Caustic embrittlement is the cracking and brittleness of boiler metal caused by the concentration of sodium hydroxide (NaOH) at stressed portions of the boiler."
          concept="A boiler operates under high temperature and pressure. Certain parts experience greater mechanical stress than others. If sodium hydroxide becomes concentrated in these regions, it attacks the metal structure. The metal gradually loses its toughness and becomes brittle, and cracks develop."
          reason="During water treatment, sodium carbonate may be present. At high temperatures, sodium carbonate can produce sodium hydroxide. The NaOH enters tiny cracks and stressed regions of the boiler and, over time, attacks and weakens the metal."
          example="Consider repeatedly bending a metal wire at the same location. After several bends, the wire becomes weak and eventually breaks. Similarly, stressed boiler regions become weak due to continuous chemical attack."
          flow={['Small Crack', 'NaOH Concentration', 'Metal Weakening', 'Crack Growth', 'Caustic Embrittlement']}
          applications={[
            'Crack formation',
            'Reduced mechanical strength',
            'Boiler leakage',
            'Structural failure',
            'Safety hazards',
          ]}
          note="Caustic embrittlement mainly occurs at high-stress locations such as riveted joints, bends, and welded sections. Prevention: use phosphate conditioning instead of sodium carbonate treatment, control boiler water chemistry, and inspect stressed regions regularly."
        />
      </Section>

      {/* 08 Topic Summary */}
      <Section number="08" title="Topic Summary" icon={FileText}>
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-5 space-y-2.5 text-[13.5px] leading-relaxed text-slate-700">
          <p>Boiler troubles are problems caused by impurities present in boiler water.</p>
          <p><span className="font-semibold text-slate-900">Sludge — </span>soft and loose deposits formed inside the boiler.</p>
          <p><span className="font-semibold text-slate-900">Scales — </span>hard deposits that strongly adhere to boiler surfaces and reduce heat transfer.</p>
          <p><span className="font-semibold text-slate-900">Boiler Corrosion — </span>gradual destruction of boiler metal due to dissolved oxygen, carbon dioxide, and acidic substances.</p>
          <p><span className="font-semibold text-slate-900">Caustic Embrittlement — </span>cracking of boiler metal caused by concentrated sodium hydroxide in stressed regions.</p>
          <p>Proper water treatment, regular maintenance, and correct boiler operation help prevent these problems and ensure efficient steam generation.</p>
        </div>
      </Section>
    </>
  );
}





function BatteryTechnologyArticle() {
  return (
    <>
      <Section number="01" title="Definition" icon={BookOpen}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2">
          <p className="text-[14px] leading-relaxed text-slate-700">
            A <span className="font-semibold text-slate-900">battery</span> is an electrochemical device that converts
            chemical energy directly into electrical energy through chemical reactions.
          </p>
          <p className="text-[13px] text-slate-600">
            Batteries are widely used in electronic devices, automobiles, industries, medical equipment, and renewable
            energy systems because they provide portable and reliable electrical power.
          </p>
        </div>
      </Section>

      <Section number="02" title="Understanding the Concept" icon={Lightbulb}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>
            Imagine your smartphone, laptop, smartwatch, wireless earbuds, or electric vehicle. All these devices need
            electricity to operate. However, carrying a power station everywhere is impossible — this problem is solved
            by batteries.
          </p>
          <p>
            A battery <span className="font-semibold text-slate-900">stores energy in the form of chemicals</span>.
            Whenever a device needs power, chemical reactions inside the battery produce electrical energy. As long as
            these reactions continue, the battery can supply electricity.
          </p>
        </div>
      </Section>

      <Section number="03" title="Why are Batteries Important?" icon={AlertTriangle}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>Modern life depends heavily on portable power. Without batteries:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {['Mobile phones would not work', 'EVs could not operate', 'Backup systems would fail', 'Medical devices unreliable'].map((t) => (
              <div key={t} className="rounded-lg border border-amber-200 bg-amber-50/60 text-amber-900 px-3 py-2 text-[12.5px] text-center">{t}</div>
            ))}
          </div>
          <p>Batteries allow electrical energy to be stored and used whenever required.</p>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Real-Life Example</p>
            <p>
              When you charge your phone overnight, electrical energy is stored inside the battery as chemical energy.
              When you use the phone during the day, the stored chemical energy is converted back into electrical
              energy. This continuous conversion makes battery-powered devices possible.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Visual Understanding</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
              <FlowChip>Chemical Energy</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Battery</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Electrical Energy</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Electronic Device</FlowChip>
            </div>
            <p className="mt-3 text-[12.5px] text-slate-600">
              <span className="font-semibold text-slate-900">Diagram Explanation: </span>
              A battery acts as an energy converter. It stores energy chemically and delivers it electrically whenever needed.
            </p>
          </div>
        </div>
      </Section>

      <Section number="04" title="Classification of Batteries" icon={Network}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>Based on their mode of operation and rechargeability, batteries are classified into:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {['Primary Batteries', 'Secondary Batteries', 'Reserve Batteries'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 text-center font-medium">{t}</div>
            ))}
          </div>
        </div>
      </Section>

      <Section number="05" title="Primary Batteries" icon={Workflow}>
        <StageBlock
          definition="Primary batteries are non-rechargeable batteries in which the chemical reactions are irreversible. Once the reactants are consumed, the battery becomes unusable and must be replaced."
          concept="Primary batteries are designed for one-time use. The chemical reactions inside the battery occur only in one direction. After the stored chemicals are exhausted, electricity can no longer be produced — the battery cannot be restored by charging."
          reason="The internal electrochemical reactions are irreversible, so applying external current cannot reverse the chemistry to restore the original reactants."
          example="TV remote batteries, wall clock batteries, torch batteries, and calculator batteries are common primary batteries used in day-to-day life."
          flow={['New Battery', 'Used in Device', 'Fully Discharged', 'Discarded']}
          applications={['Low cost & easy to use', 'Long shelf life', 'Minimal maintenance', 'Cannot be recharged', 'Must be replaced after discharge', 'Higher long-term operating cost']}
          note="Primary batteries are ideal for low-drain devices that are used occasionally and benefit from long shelf life."
        />
      </Section>

      <Section number="06" title="Secondary Batteries" icon={Workflow}>
        <StageBlock
          definition="Secondary batteries are rechargeable batteries in which the chemical reactions are reversible. After discharge, electrical energy can be supplied to restore the original chemical state."
          concept="Unlike primary batteries, secondary batteries can be used repeatedly. When the battery discharges, chemical energy is converted to electrical energy. During charging, electrical energy is converted back to chemical energy. This cycle can be repeated many times."
          reason="The electrochemical reactions are reversible, allowing the cell chemistry to be restored when current is supplied in the opposite direction."
          example="Mobile phone batteries, laptop batteries, electric vehicle batteries, and UPS batteries are all rechargeable secondary batteries."
          flow={['Charge', 'Battery', 'Discharge', 'Recharge', 'Reuse']}
          applications={['Rechargeable', 'Economical for long-term use', 'High energy efficiency', 'Environmentally friendly', 'Higher initial cost', 'Limited charging cycles']}
          note="Secondary batteries dominate modern portable electronics and electric mobility due to their reusability and overall economy."
        />
      </Section>

      <Section number="07" title="Reserve Batteries" icon={Workflow}>
        <StageBlock
          definition="Reserve batteries are batteries in which one or more reactants are stored separately and activated only when required."
          concept="In normal batteries, the chemicals remain in contact continuously. In reserve batteries, important reactants are separated until activation. As a result, self-discharge is minimized and shelf life becomes very long. The battery starts working only when activated."
          reason="Keeping reactants physically separated prevents self-discharge reactions during storage, preserving the battery's energy for the moment it is needed."
          example="Military equipment, missiles, emergency rescue systems, and spacecraft systems use reserve batteries because they must work instantly even after years of storage."
          flow={['Stored State', 'Activation', 'Chemical Reaction Starts', 'Power Generation']}
          applications={['Military & defense systems', 'Missiles & spacecraft', 'Emergency rescue equipment', 'Very long shelf life', 'Reliable instant activation', 'Minimal self-discharge']}
          note="Reserve batteries provide reliable power even after long storage periods, making them critical for safety-critical and standby applications."
        />
      </Section>

      <Section number="08" title="Commercial Parameters of Batteries" icon={ListChecks}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>Before selecting a battery, engineers evaluate several commercial parameters.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <p className="text-[13px] font-semibold text-slate-900">1. Capacity</p>
              <p className="text-[12.5px] text-slate-600 mt-1">
                Amount of electrical charge a battery can deliver, measured in Ampere-hour (Ah) or milliampere-hour (mAh). Example: A 5000 mAh mobile battery generally supplies power longer than a 3000 mAh battery.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <p className="text-[13px] font-semibold text-slate-900">2. Energy Density</p>
              <p className="text-[12.5px] text-slate-600 mt-1">
                Amount of energy stored per unit mass or volume. Higher energy density means smaller battery size, lower weight, and longer operation.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <p className="text-[13px] font-semibold text-slate-900">3. Cycle Life</p>
              <p className="text-[12.5px] text-slate-600 mt-1">
                Number of charge-discharge cycles a battery can undergo before its performance significantly decreases. Higher cycle life means a longer battery lifespan.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <p className="text-[13px] font-semibold text-slate-900">4. Shelf Life</p>
              <p className="text-[12.5px] text-slate-600 mt-1">
                Period during which a battery can be stored without significant loss of performance.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 md:col-span-2">
              <p className="text-[13px] font-semibold text-slate-900">5. Cost</p>
              <p className="text-[12.5px] text-slate-600 mt-1">
                Battery selection must balance performance, life span, maintenance, and cost.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section number="09" title="Zinc-Air Battery" icon={Zap}>
        <StageBlock
          definition="A Zinc-Air battery is a primary battery that uses zinc as the anode and oxygen from atmospheric air as the cathode reactant."
          concept="Unlike many batteries that carry both reactants internally, Zinc-Air batteries obtain oxygen directly from the surrounding air. This reduces battery weight and increases energy storage capacity, since more space inside the battery can be used for storing zinc."
          reason="During operation, zinc undergoes oxidation and oxygen from air undergoes reduction. The reaction occurs in an alkaline electrolyte, generating electrical energy. Anode: Zinc · Cathode: Oxygen from air · Electrolyte: Alkaline solution."
          example="Hearing aids, medical devices, navigation equipment, and small electronic devices commonly use Zinc-Air batteries because of their compact size and high energy capacity."
          flow={['Atmospheric Air', 'Oxygen', 'Zinc-Air Battery', 'Electrical Energy']}
          applications={['High energy density', 'Lightweight', 'Long shelf life', 'Environmentally friendly', 'Hearing aids & medical devices', 'Navigation equipment']}
          note="Zinc-Air batteries are widely known for their high energy storage capability compared to their size."
        />
      </Section>

      <Section number="10" title="Lithium-Ion Battery" icon={Zap}>
        <StageBlock
          definition="A Lithium-Ion battery is a rechargeable battery in which lithium ions move between the anode and cathode during charging and discharging."
          concept="Lithium is one of the lightest metals. Because of its low weight and excellent energy storage capability, lithium-ion batteries have become the most popular rechargeable batteries in the world. Almost every modern portable device uses lithium-ion technology."
          reason="During discharge, lithium ions move from anode (Graphite) → cathode (Lithium metal oxide) through a lithium salt electrolyte, supplying electricity to the device. During charging, the ions move back from cathode → anode, storing energy again."
          example="Smartphones, laptops, smartwatches, drones, and electric vehicles all rely on lithium-ion batteries for their daily operation."
          flow={['Anode', 'Lithium Ions', 'Cathode', 'Electricity Produced']}
          applications={['High energy density', 'Lightweight', 'Fast charging', 'Long cycle life', 'Low self-discharge', 'Used in EVs & electronics']}
          note="Lithium-ion batteries dominate modern energy storage because they provide high energy with relatively low weight."
        />
      </Section>

      <Section number="11" title="Batteries in Electric Vehicles (EVs)" icon={Network}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p>
              Electric vehicle batteries are high-capacity rechargeable battery systems that store electrical energy and provide power to the electric motor.
            </p>
          </div>
          <p>
            Unlike conventional vehicles that use petrol or diesel, electric vehicles use batteries as their primary energy source. The battery pack acts as the <span className="font-semibold">fuel tank</span> of the EV. The stored electrical energy is supplied to the motor, which rotates the wheels and moves the vehicle.
          </p>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Why are Lithium-Ion Batteries Used in EVs?</p>
            <p>Electric vehicles require batteries that are lightweight, rechargeable, high capacity, and long lasting. Lithium-ion batteries satisfy all these requirements, so most modern EVs use lithium-ion battery packs.</p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-2">Mechanics of EV Battery Operation</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[12.5px]">
              {[
                'Step 1 — Battery stores electrical energy',
                'Step 2 — BMS controls power delivery',
                'Step 3 — Electricity flows to the motor',
                'Step 4 — Motor converts energy to motion',
                'Step 5 — Wheels rotate, vehicle moves',
              ].map((s) => (
                <div key={s} className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-slate-700">{s}</div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Visual Understanding</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
              <FlowChip>Battery Pack</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Battery Management System</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Electric Motor</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Wheel Rotation</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Vehicle Movement</FlowChip>
            </div>
            <p className="mt-3 text-[12.5px] text-slate-600">
              <span className="font-semibold text-slate-900">Diagram Explanation: </span>
              The battery stores energy, the management system controls power flow, and the motor converts electrical energy into motion.
            </p>
          </div>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px]">
              <span className="font-semibold text-slate-900">Regenerative Braking — </span>
              The electric motor acts as a generator during braking and converts mechanical energy back into electrical energy. In conventional vehicles, braking energy is lost as heat. In EVs, part of this energy is recovered and stored back into the battery, improving efficiency and range.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-2">Advantages of EV Batteries</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[12.5px]">
              {['Zero tailpipe emissions', 'High efficiency', 'Reduced fuel dependency', 'Lower operating cost', 'Quiet operation', 'Used in cars, buses, bikes, trucks'].map((a) => (
                <div key={a} className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-slate-700">{a}</div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section number="12" title="Topic Summary" icon={FileText}>
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-5 space-y-2.5 text-[13.5px] leading-relaxed text-slate-700">
          <p>Batteries are electrochemical devices that convert chemical energy into electrical energy.</p>
          <p>Based on operation, batteries are classified into <span className="font-semibold">Primary, Secondary, and Reserve</span> batteries.</p>
          <p>Important commercial parameters include capacity, energy density, cycle life, shelf life, and cost.</p>
          <p><span className="font-semibold text-slate-900">Zinc-Air batteries</span> use zinc and atmospheric oxygen to generate electricity and are known for high energy density.</p>
          <p><span className="font-semibold text-slate-900">Lithium-Ion batteries</span> are rechargeable batteries widely used in smartphones, laptops, and electric vehicles.</p>
          <p>Electric vehicles mainly use lithium-ion battery packs because of their high energy density, lightweight design, and long cycle life.</p>
        </div>
      </Section>
    </>
  );
}


function FuelSolarCellsArticle() {
  return (
    <>
      <Section number="01" title="Definition" icon={BookOpen}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2">
          <p className="text-[14px] leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Fuel cells</span> and{' '}
            <span className="font-semibold text-slate-900">solar cells</span> are advanced energy conversion technologies that generate electricity using clean and efficient methods.
          </p>
          <ul className="ml-4 space-y-1 text-[13px] text-slate-700">
            <li>• <span className="font-medium">Fuel Cells</span> convert the chemical energy of a fuel directly into electrical energy.</li>
            <li>• <span className="font-medium">Solar Cells</span> convert sunlight directly into electrical energy.</li>
          </ul>
          <p className="text-[13px] text-slate-600">
            Both technologies are important in modern energy systems because they help reduce pollution and dependence on fossil fuels.
          </p>
        </div>
      </Section>

      <Section number="02" title="Fuel Cells" icon={Zap}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p>
              A fuel cell is an electrochemical device that converts the chemical energy of a continuously supplied fuel and oxidant directly into electrical energy.
            </p>
          </div>
          <p>
            Unlike conventional batteries, fuel cells do not store energy internally. They <span className="font-semibold">generate electricity as long as fuel is supplied</span>.
          </p>
        </div>
      </Section>

      <Section number="03" title="Understanding the Concept" icon={Lightbulb}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>
            Think about a mobile phone battery. After some time, the battery becomes discharged and must be recharged. A fuel cell works differently — instead of storing a fixed amount of energy, it continuously receives fuel from an external source.
          </p>
          <p>As long as fuel is available: electricity is generated, the system continues to operate, and no recharging is required. This makes fuel cells highly suitable for applications requiring long-duration power generation.</p>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Why Are Fuel Cells Important?</p>
            <p>
              The world's energy demand is increasing rapidly while fossil fuel reserves are decreasing and pollution and carbon emissions are becoming major concerns. Fuel cells provide a cleaner alternative because they can produce electricity with higher efficiency and lower environmental impact.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Real-Life Example</p>
            <p>
              Imagine a diesel generator — it generates electricity continuously as long as diesel is supplied. A fuel cell operates on a similar principle, but electricity is generated electrochemically rather than through combustion, resulting in higher efficiency and less pollution.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Visual Understanding</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
              <FlowChip>Fuel</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Fuel Cell</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip>Electrical Energy</FlowChip>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <FlowChip tone="warn">Oxidant (input)</FlowChip>
            </div>
            <p className="mt-3 text-[12.5px] text-slate-600">
              <span className="font-semibold text-slate-900">Diagram Explanation: </span>
              Fuel and oxidant continuously enter the fuel cell. Chemical reactions generate electricity, which is supplied to external devices.
            </p>
          </div>
        </div>
      </Section>

      <Section number="04" title="Difference Between Batteries and Fuel Cells" icon={GitCompare}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <p>Although both produce electricity through chemical reactions, their operation differs significantly.</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-[12.5px]">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold border-b border-slate-200">Feature</th>
                  <th className="text-left px-3 py-2 font-semibold border-b border-slate-200">Battery</th>
                  <th className="text-left px-3 py-2 font-semibold border-b border-slate-200">Fuel Cell</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {[
                  ['Energy Source', 'Stored inside battery', 'Supplied continuously from outside'],
                  ['Operation Time', 'Limited by stored chemicals', 'Continues as long as fuel is supplied'],
                  ['Recharging', 'Required after discharge', 'Not required during operation'],
                  ['Fuel Supply', 'Internal', 'External'],
                  ['Energy Generation', 'Stored energy is used', 'Energy generated continuously'],
                  ['Application', 'Mobile devices, laptops', 'Vehicles, power plants, spacecraft'],
                ].map((row) => (
                  <tr key={row[0]} className="border-b last:border-b-0 border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{row[0]}</td>
                    <td className="px-3 py-2">{row[1]}</td>
                    <td className="px-3 py-2">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px]">
              <span className="font-semibold text-slate-900">Easy Understanding · </span>
              A battery is like a <span className="font-medium">water bottle</span> — once empty, it must be refilled. A fuel cell is like a <span className="font-medium">water tap</span> connected to a pipeline — as long as water keeps flowing, the tap can provide water continuously.
            </p>
          </div>
        </div>
      </Section>

      <Section number="05" title="Methanol-Oxygen Fuel Cell" icon={Workflow}>
        <StageBlock
          definition="A Methanol-Oxygen Fuel Cell is a fuel cell that uses methanol as fuel and oxygen as the oxidizing agent to generate electrical energy."
          concept="Methanol is a liquid fuel that is easy to store and transport. Inside the fuel cell, methanol undergoes oxidation, oxygen undergoes reduction, and electrical energy is generated. Because methanol is a liquid, it is easier to handle compared to gaseous fuels such as hydrogen."
          reason="Methanol offers easy storage, easy transportation, high energy content, and convenient handling — properties that make it attractive for portable power systems. Working: methanol enters the anode and is oxidized → electrons flow through the external circuit → oxygen enters the cathode and combines with reaction products."
          example="Methanol fuel cells are especially useful where compact and portable energy sources are required, such as in portable electronics, military equipment, and backup power systems."
          flow={['Methanol → Anode', 'Electrons', 'External Circuit', 'Cathode ← Oxygen']}
          applications={['Portable power systems', 'Military equipment', 'Remote electronic devices', 'Backup power systems', 'High efficiency', 'Reduced emissions']}
          note="Methanol fuel cells are especially useful where compact and portable energy sources are required."
        />
      </Section>

      <Section number="06" title="Solid Oxide Fuel Cell (SOFC)" icon={Workflow}>
        <StageBlock
          definition="A Solid Oxide Fuel Cell (SOFC) is a high-temperature fuel cell that uses a solid ceramic electrolyte to generate electricity."
          concept="Unlike many fuel cells that use liquid electrolytes, SOFCs use a solid ceramic material. They operate at very high temperatures, typically between 600°C and 1000°C. The high operating temperature allows efficient energy conversion and the use of different fuels."
          reason="Most fuel cells require highly purified fuel. SOFCs can operate using hydrogen, natural gas, biogas, or other hydrocarbon fuels — this flexibility makes them highly valuable for industrial applications."
          example="Used in power generation plants, industrial power systems, distributed energy systems, and combined heat and power plants. The solid electrolyte allows ion movement while forcing electrons through the external circuit, generating electricity."
          flow={['Fuel → Anode', 'Solid Electrolyte', 'Cathode ← Oxygen', 'Electricity Generated']}
          applications={['Power generation plants', 'Industrial power systems', 'Distributed energy systems', 'Combined heat & power plants', 'High fuel flexibility', 'Long operating life']}
          note="SOFCs operate at much higher temperatures than most other fuel cells, which contributes to their high efficiency."
        />
      </Section>

      <Section number="07" title="Solar Cells" icon={Zap}>
        <div className="space-y-3 text-[14px] leading-relaxed">
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
            <p>
              A solar cell is a semiconductor device that converts sunlight directly into electrical energy through the <span className="font-semibold">photovoltaic effect</span>.
            </p>
          </div>
          <p>
            Every day, the Sun continuously supplies enormous amounts of energy to the Earth. Instead of wasting this energy, solar cells capture sunlight and convert it into electricity. This process does not require fuel, moving parts, or combustion — as a result, solar energy is considered one of the cleanest renewable energy sources.
          </p>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Why is Solar Energy Important?</p>
            <p>
              Conventional energy sources such as coal, petroleum, and natural gas are limited. Solar energy is renewable, abundant, environmentally friendly, and sustainable — making solar technology increasingly important worldwide.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Real-Life Example</p>
            <p>
              Solar panels installed on rooftops generate electricity during the day. This electricity can power fans, lights, air conditioners, and household appliances without consuming conventional fuels.
            </p>
          </div>
        </div>
      </Section>

      <Section number="08" title="Photovoltaic Cells" icon={Workflow}>
        <StageBlock
          definition="A photovoltaic (PV) cell is a semiconductor device that converts solar energy directly into electrical energy. The word 'photovoltaic' means electricity generated from light."
          concept="Photovoltaic cells are usually made from silicon. When sunlight falls on the cell, light energy strikes the semiconductor material, electrons gain energy and begin moving, and electric current is produced. This phenomenon is called the photovoltaic effect."
          reason="Sunlight contains energy in the form of photons. When photons strike the semiconductor surface, electrons become excited and their movement creates an electric current. This electrical energy can then be used directly or stored in batteries."
          example="Rooftop solar panels, solar street lights, solar water pumps, satellites, spacecraft, solar calculators, and solar-powered charging systems all rely on photovoltaic cells."
          flow={['Sunlight', 'Photovoltaic Cell', 'Electrical Energy', 'Load / Battery']}
          applications={['Residential rooftop systems', 'Solar street lighting', 'Solar water pumps (agriculture)', 'Satellites & spacecraft', 'Solar calculators & chargers', 'Renewable energy projects']}
          note="Solar cells offer renewable energy, no fuel consumption, low maintenance, and silent operation — though initial installation cost is high and output depends on sunlight."
        />
      </Section>

      <Section number="09" title="Engineering Applications" icon={Building2}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[13px]">
          {['Smart cities', 'Renewable energy projects', 'EV charging stations', 'Rural electrification programs', 'Space technology', 'Distributed power systems'].map((a) => (
            <div key={a} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-slate-700">{a}</div>
          ))}
        </div>
      </Section>

      <Section number="10" title="Topic Summary" icon={FileText}>
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-5 space-y-2.5 text-[13.5px] leading-relaxed text-slate-700">
          <p>Fuel cells are electrochemical devices that generate electricity continuously as long as fuel and oxidant are supplied.</p>
          <p>Unlike batteries, fuel cells do not store a fixed amount of energy and therefore do not require recharging during operation.</p>
          <p><span className="font-semibold text-slate-900">Methanol-Oxygen Fuel Cell — </span>uses methanol as fuel and oxygen as the oxidant.</p>
          <p><span className="font-semibold text-slate-900">Solid Oxide Fuel Cell (SOFC) — </span>uses a solid ceramic electrolyte and operates at high temperatures with high efficiency.</p>
          <p>Solar cells are semiconductor devices that convert sunlight directly into electricity through the photovoltaic effect.</p>
          <p>Photovoltaic cells are widely used in homes, industries, agriculture, transportation, and space applications because they provide clean and renewable energy.</p>
        </div>
      </Section>
    </>
  );
}


function CorrosionPrinciplesArticle() {
  return (
    <>
      <Section number="01" title="Definition" icon={BookOpen}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5">
          <p className="text-[14px] leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Corrosion</span> is the gradual deterioration or destruction of a metal due to its reaction with the surrounding environment.
            In simple terms, it is the process by which metals slowly lose their <span className="font-medium text-blue-700">strength and properties</span> because of chemical or electrochemical reactions.
          </p>
        </div>
      </Section>

      <Section number="02" title="Understanding the Concept" icon={Lightbulb}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <p>Look around your surroundings. You may notice:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {['Rust on iron gates', 'Corroded water pipes', 'Damaged bridges', 'Rusted bicycle chains', 'Corroded ship structures'].map((i) => (
              <li key={i} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{i}
              </li>
            ))}
          </ul>
          <p>Most metals are extracted from naturally occurring ores using a large amount of energy. After extraction, they naturally tend to return to their stable ore-like state by reacting with the environment. This gradual return to a stable state is called <span className="font-medium text-slate-900">corrosion</span>.</p>
        </div>
      </Section>

      <Section number="03" title="Why Does Corrosion Occur?" icon={AlertTriangle}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <p>Metals are generally unstable in their pure form. When exposed to:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[13px]">
            {['Air', 'Moisture', 'Water', 'Chemicals', 'Acids', 'Salts'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-medium text-slate-800">{t}</div>
            ))}
          </div>
          <p>they tend to react and form compounds such as <span className="font-medium text-slate-900">oxides, sulphides, and hydroxides</span>, which weaken the metal over time.</p>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Real-Life Example</p>
            <p>When a new iron gate is installed, it appears shiny and strong. After several years of exposure to rain and air, reddish-brown rust begins to appear. Gradually, the surface becomes rough, strength decreases, and the metal weakens. This process is corrosion.</p>
          </div>
        </div>
      </Section>

      <Section number="04" title="Visual Understanding" icon={Workflow}>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
            <FlowChip>Pure Metal</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip>Exposure to Environment</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip>Chemical Reactions</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip>Corrosion Products</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip tone="warn">Metal Damage</FlowChip>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-[13px] text-slate-700 leading-relaxed">
          Environmental factors react with the metal surface, producing corrosion products that gradually weaken the material.
        </div>
      </Section>

      <Section number="05" title="Why is Corrosion a Major Engineering Problem?" icon={AlertTriangle}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <p>Corrosion causes enormous economic losses worldwide. It can lead to:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {['Equipment failure', 'Structural damage', 'Increased maintenance costs', 'Reduced efficiency', 'Safety hazards'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-800">{t}</div>
            ))}
          </div>
          <p className="text-slate-900 font-medium">Engineering Examples — corrosion can affect:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[13px]">
            {['Bridges', 'Boilers', 'Pipelines', 'Ships', 'Aircraft', 'Automobiles', 'Storage tanks', 'Industrial machinery'].map((t) => (
              <div key={t} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-slate-700">{t}</div>
            ))}
          </div>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px] text-slate-700"><span className="font-semibold text-slate-900">Important Note: </span>Corrosion is not just a surface problem — in severe cases, it can completely destroy a metal structure.</p>
          </div>
        </div>
      </Section>

      <Section number="06" title="Types of Corrosion" icon={ListChecks}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[13px]">
          {['Chemical Corrosion (Dry Corrosion)', 'Electrochemical Corrosion (Wet Corrosion)'].map((m) => (
            <div key={m} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-medium text-slate-800 text-center">{m}</div>
          ))}
        </div>
      </Section>

      <Section number="07" title="Chemical Corrosion (Dry Corrosion)" icon={Workflow}>
        <StageBlock
          definition="Chemical corrosion is the deterioration of a metal due to direct chemical reaction between the metal and dry gases in the absence of moisture. It is also known as Dry Corrosion."
          concept="Metals react directly with gases such as oxygen, sulphur dioxide, chlorine, and hydrogen sulphide. No water or electrolyte is required — the reaction occurs directly on the metal surface."
          reason="At elevated temperatures, metals become more reactive. When exposed to gases, the metal surface reacts and forms compounds such as metal oxides, sulphides, or chlorides. These may either protect the metal or continue damaging it."
          example="When a steel component is heated continuously in a furnace, a layer of oxide forms on its surface. This is an example of dry corrosion."
          applications={['Furnaces', 'Boilers', 'Gas turbines', 'High-temperature industrial equipment']}
          note="Chemical corrosion generally becomes significant at high temperatures."
          flow={['Metal Surface', 'Dry Gas Exposure', 'Chemical Reaction', 'Oxide Layer Formation']}
        />
      </Section>

      <Section number="08" title="Electrochemical Corrosion (Wet Corrosion)" icon={Workflow}>
        <StageBlock
          definition="Electrochemical corrosion is the deterioration of a metal due to electrochemical reactions occurring in the presence of moisture or an electrolyte. It is also known as Wet Corrosion."
          concept="Unlike dry corrosion, moisture is necessary. When water is present, tiny electrochemical cells form on the metal surface. Some regions act as anode and others as cathode — the anodic region loses metal and corrosion occurs."
          reason="Water containing dissolved salts acts as an electrolyte. This allows the movement of ions and electrons, electrochemical reactions begin, and metal dissolution occurs."
          example="A bicycle left outside during the rainy season develops rust because moisture enables electrochemical corrosion."
          applications={['Ships', 'Bridges', 'Pipelines', 'Underground tanks', 'Marine structures']}
          note="Most real-world corrosion problems are electrochemical in nature."
          flow={['Metal Surface', 'Water Present', 'Electrochemical Cell Forms', 'Metal Dissolves', 'Corrosion']}
        />
      </Section>

      <Section number="09" title="Galvanic Corrosion" icon={Workflow}>
        <StageBlock
          definition="Galvanic corrosion occurs when two dissimilar metals are electrically connected in the presence of an electrolyte."
          concept="Different metals have different tendencies to lose electrons. When two different metals come into contact, one becomes the anode and the other the cathode. The anodic metal corrodes faster."
          reason="The difference in electrode potentials between the metals creates an electrical cell. The more active metal sacrifices itself and corrodes."
          example="When an iron pipe is connected directly to a copper pipe in the presence of water, iron acts as the anode and copper as the cathode — iron corrodes faster."
          applications={['Pipelines', 'Marine equipment', 'Ship structures', 'Fasteners and joints']}
          note="The farther apart two metals are in the galvanic series, the greater the corrosion risk."
          flow={['Iron (Anode)', 'Electron Flow', 'Copper (Cathode)', 'Electrolyte', 'Iron Corrodes']}
        />
      </Section>

      <Section number="10" title="Pitting Corrosion" icon={Workflow}>
        <StageBlock
          definition="Pitting corrosion is a highly localized form of corrosion that produces small holes or pits on the metal surface."
          concept="Instead of affecting the entire surface, corrosion occurs at specific locations. Deep pits gradually form and penetrate the metal — it often appears small on the surface while causing severe internal damage."
          reason="Pitting often starts when a protective oxide layer is damaged. Common causes include chloride ions, mechanical damage, and surface defects. Once the protective layer breaks, rapid localized corrosion begins."
          example="A stainless-steel water tank may appear perfectly fine from the outside, however small pits may develop internally and eventually cause leakage."
          applications={['Leakage', 'Sudden equipment failure', 'Structural weakening']}
          note="Pitting corrosion is often difficult to detect until significant damage has already occurred."
          flow={['Protective Layer', 'Localized Damage', 'Chloride Attack', 'Pit Forms', 'Deep Penetration']}
        />
      </Section>

      <Section number="11" title="Waterline Corrosion" icon={Workflow}>
        <StageBlock
          definition="Waterline corrosion is a form of differential aeration corrosion that occurs at the interface between water and air."
          concept="In a partially filled metal tank, the portion above water receives more oxygen and the portion just below receives less. This difference in oxygen concentration creates an electrochemical cell, and corrosion occurs near the waterline."
          reason="Different oxygen concentrations create anodic and cathodic regions. The area with lower oxygen concentration becomes the anode and corrodes faster."
          example="Water storage tanks, ships, and underground structures often experience corrosion near the water level rather than at completely submerged locations."
          applications={['Water storage tanks', 'Ships', 'Marine structures', 'Industrial vessels']}
          note="Waterline corrosion is a classic example of differential aeration corrosion."
          flow={['Air (High O₂)', 'Waterline', 'Corrosion Zone (Low O₂)', 'Water', 'Anode Corrodes']}
        />
      </Section>

      <Section number="12" title="Topic Summary" icon={FileText}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2 text-[13.5px] leading-relaxed text-slate-700">
          <p>Corrosion is the gradual destruction of metals due to chemical or electrochemical reactions with the environment.</p>
          <p><span className="font-semibold text-slate-900">Chemical (Dry) Corrosion — </span>occurs through direct reaction with dry gases in the absence of moisture.</p>
          <p><span className="font-semibold text-slate-900">Electrochemical (Wet) Corrosion — </span>occurs in the presence of water or electrolytes and is the most common form.</p>
          <p><span className="font-semibold text-slate-900">Galvanic Corrosion — </span>occurs when dissimilar metals are connected in an electrolyte.</p>
          <p><span className="font-semibold text-slate-900">Pitting Corrosion — </span>produces localized holes or pits on the metal surface.</p>
          <p><span className="font-semibold text-slate-900">Waterline Corrosion — </span>occurs near the air-water interface due to differences in oxygen concentration.</p>
          <p>Understanding these mechanisms helps engineers design safer, more durable, and more reliable structures and equipment.</p>
        </div>
      </Section>
    </>
  );
}


function CorrosionControlArticle() {
  return (
    <>
      <Section number="01" title="Definition" icon={BookOpen}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5">
          <p className="text-[14px] leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Corrosion control</span> refers to the methods and techniques used to prevent, reduce, or slow down the corrosion of metals.
            The main objective is to <span className="font-medium text-blue-700">increase the life of metal structures</span>, improve safety, reduce maintenance costs, and ensure efficient operation of engineering systems.
          </p>
        </div>
      </Section>

      <Section number="02" title="Understanding the Concept" icon={Lightbulb}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <p>In the previous topic, we learned that corrosion can gradually damage metals through chemical and electrochemical reactions.</p>
          <p className="text-slate-900 font-medium">If corrosion is not controlled:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {['Bridges may weaken', 'Pipelines may leak', 'Boilers may fail', 'Ships may deteriorate', 'Industrial equipment may become unsafe'].map((i) => (
              <li key={i} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />{i}
              </li>
            ))}
          </ul>
          <p>Since replacing corroded equipment is expensive, engineers use various protection techniques to prevent corrosion before serious damage occurs. This process is called <span className="font-medium text-slate-900">corrosion control</span>.</p>
        </div>
      </Section>

      <Section number="03" title="Why is Corrosion Control Important?" icon={AlertTriangle}>
        <div className="space-y-3.5 text-[14px] leading-relaxed">
          <p>Every year, industries spend enormous amounts of money repairing or replacing corroded equipment. Apart from financial losses, corrosion can also cause:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {['Production shutdowns', 'Environmental pollution', 'Safety hazards', 'Structural failures'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-800">{t}</div>
            ))}
          </div>
          <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
            <p className="text-[13px] text-slate-700">Preventing corrosion is often <span className="font-semibold text-slate-900">much cheaper</span> than repairing corrosion damage.</p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Real-Life Example</p>
            <p>Consider an underground water pipeline. It is continuously exposed to moisture and dissolved salts in soil. Without protection, corrosion gradually weakens the pipe and causes leakage. Engineers apply corrosion protection methods before installing the pipeline.</p>
          </div>
        </div>
      </Section>

      <Section number="04" title="Visual Understanding" icon={Workflow}>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
            <FlowChip>Metal Structure</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip>Exposure to Environment</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip>Corrosion Risk</FlowChip>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <FlowChip tone="warn">Corrosion Control</FlowChip>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium mt-3">
            <FlowChip>Cathodic Protection</FlowChip>
            <FlowChip>Surface Coating</FlowChip>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-[13px] text-slate-700 leading-relaxed">
          Instead of allowing corrosion to occur naturally, engineers use protection methods that either stop the corrosion reaction or isolate the metal from the environment.
        </div>
      </Section>

      <Section number="05" title="Methods of Corrosion Control" icon={ListChecks}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[13px]">
          {['Cathodic Protection', 'Surface Coating'].map((m) => (
            <div key={m} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-medium text-slate-800 text-center">{m}</div>
          ))}
        </div>
      </Section>

      <Section number="06" title="Cathodic Protection" icon={BookOpen}>
        <StageBlock
          definition="A corrosion prevention technique in which the metal to be protected is forced to act as a cathode, thereby preventing its corrosion."
          concept="In electrochemical corrosion, corrosion occurs at the anodic region while the cathodic region remains protected. If the entire metal structure can be made to behave like a cathode, corrosion can be prevented."
          reason="Corrosion involves loss of electrons by metal atoms at the anode. If the structure is converted into a cathode, electron loss stops, metal dissolution stops, and corrosion is greatly reduced."
          example="Underground pipelines, ship hulls, storage tanks, and offshore structures — constantly exposed to corrosive environments — are widely protected using cathodic protection."
          applications={['Sacrificial Anode Method', 'Impressed Current Method']}
          note="Cathodic protection comes in two major forms: the Sacrificial Anode Method and the Impressed Current Method."
        />
      </Section>

      <Section number="07" title="Sacrificial Anode Method" icon={Workflow}>
        <StageBlock
          definition="A cathodic protection technique in which a more active metal is connected to the metal structure that needs protection. The more active metal corrodes instead of the protected structure."
          concept="Every metal has a different tendency to lose electrons. When a highly reactive metal is connected to iron or steel, the reactive metal becomes the anode and the iron/steel becomes the cathode. Since corrosion occurs at the anode, the reactive metal corrodes while the main structure stays safe."
          reason="The active metal intentionally sacrifices itself to protect the main structure — hence the name sacrificial anode. Common materials are Magnesium (underground pipelines), Zinc (marine environments), and Aluminium (large offshore structures)."
          example="Many ships use zinc blocks attached to their hulls. Over time, the zinc gradually corrodes while the steel hull remains protected."
          applications={['Ship hulls', 'Underground pipelines', 'Water heaters', 'Storage tanks', 'Marine structures']}
          note="The sacrificial anode must be replaced periodically because it gradually gets consumed during protection."
          flow={['Sacrificial Anode (Zn)', 'Electron Flow', 'Steel Structure', 'Zinc Corrodes', 'Steel Protected']}
        />
      </Section>

      <Section number="08" title="Impressed Current Method" icon={Workflow}>
        <StageBlock
          definition="A cathodic protection technique in which an external DC power source supplies electrons to the metal structure that requires protection."
          concept="In large structures, sacrificial anodes may not provide sufficient protection. Instead, an external DC supply continuously provides electrons to the metal structure, forcing it to behave as a cathode."
          reason="The external current continuously compensates for electron loss. Since the protected structure receives electrons from the power supply, it does not undergo oxidation and corrosion is minimized."
          example="Long-distance oil and gas pipelines often use impressed current systems because sacrificial anodes alone cannot provide adequate protection over such distances."
          applications={['Oil pipelines', 'Gas pipelines', 'Offshore platforms', 'Storage tanks', 'Large marine structures']}
          note="Unlike sacrificial anode systems, impressed current systems require an external electrical power source. Components: DC Power Source, Inert Anode (graphite/platinum), and the Protected Structure (cathode)."
          flow={['DC Power Supply', 'Inert Anode', 'Electrolyte', 'Protected Structure', 'Acts as Cathode']}
        />
      </Section>

      <Section number="09" title="Surface Coating" icon={BookOpen}>
        <StageBlock
          definition="A corrosion control method in which a protective layer is applied to the metal surface to isolate it from the surrounding environment."
          concept="Corrosion occurs when the metal comes into direct contact with moisture, oxygen, or corrosive chemicals. A protective barrier placed between the metal and the environment prevents these reactions from occurring."
          reason="The coating blocks oxygen, moisture, and corrosive chemicals from reaching the metal surface, significantly reducing corrosion."
          example="Painted iron gates, galvanized roofing sheets, and chrome-plated taps all rely on a protective surface coating to resist rust and corrosion."
          applications={['Painting', 'Galvanizing', 'Electroplating', 'Electroless Nickel Plating']}
          note="Among these, Electroless Nickel Plating is particularly important in Engineering Chemistry."
        />
      </Section>

      <Section number="10" title="Electroless Nickel Plating" icon={Workflow}>
        <StageBlock
          definition="A chemical deposition process in which a uniform layer of nickel is deposited on a metal surface without using external electrical energy."
          concept="In ordinary electroplating, electrical current is required to deposit metal. In electroless plating, no external current is used — a chemical reducing agent causes nickel ions in the solution to deposit on the metal surface automatically through a chemical reaction."
          reason='The word "electroless" means no electricity is used during plating. The coating is produced entirely through chemical reactions between nickel salts and a reducing agent.'
          example="Automotive parts with complex shapes, electronic connectors, and aerospace components are electroless nickel plated to obtain a uniform, hard, and corrosion-resistant surface."
          applications={['Automotive components', 'Electronic equipment', 'Aerospace components', 'Industrial machinery', 'Chemical processing equipment']}
          note="A major advantage of electroless nickel plating over electroplating is its ability to produce a highly uniform coating on irregular and complex surfaces."
          flow={['Metal Surface', 'Nickel Salt Solution', 'Reducing Agent', 'Nickel Deposition', 'Protective Coating']}
        />
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[13px]">
          {[
            ['Uniform Coating', 'Thickness remains uniform even on complex shapes.'],
            ['Excellent Corrosion Resistance', 'The nickel layer protects the metal from environmental attack.'],
            ['High Hardness', 'Improves wear resistance significantly.'],
            ['No Electrical Equipment', 'Simplifies the plating process and setup.'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
              <p className="font-semibold text-slate-900 mb-0.5">{k}</p>
              <p className="text-slate-600 text-[12px]">{v}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section number="11" title="Topic Summary" icon={FileText}>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-5 space-y-2 text-[13.5px] leading-relaxed text-slate-700">
          <p>Corrosion control involves techniques used to prevent or reduce metal deterioration.</p>
          <p><span className="font-semibold text-slate-900">Cathodic Protection — </span>the metal is forced to act as a cathode. Two main methods:</p>
          <p className="pl-3">• <span className="font-medium text-slate-900">Sacrificial Anode Method:</span> a more reactive metal (Zn, Mg, Al) corrodes instead of the protected structure.</p>
          <p className="pl-3">• <span className="font-medium text-slate-900">Impressed Current Method:</span> an external DC source provides electrons to the structure to prevent corrosion.</p>
          <p><span className="font-semibold text-slate-900">Surface Coating — </span>a protective barrier prevents contact between metal and environment.</p>
          <p><span className="font-semibold text-slate-900">Electroless Nickel Plating — </span>deposits a uniform nickel layer chemically without electricity, providing excellent corrosion and wear resistance.</p>
        </div>
      </Section>
    </>
  );
}

function StageBlock(props: {

  definition: string;
  concept: string;
  reason: string;
  example: string;
  applications: string[];
  note: string;
  flow?: string[];
  visualTitle?: string;
  visualBefore?: string[];
  visualAfter?: string[];
}) {
  const { definition, concept, reason, example, applications, note, flow, visualTitle, visualBefore, visualAfter } = props;
  return (
  <div className="space-y-3.5 text-[14px] leading-relaxed">
    <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Definition</p>
      <p className="text-[14px] text-slate-700">{definition}</p>
    </div>
    <div>
      <p className="text-[13px] font-semibold text-slate-900 mb-1">Understanding the Concept</p>
      <p>{concept}</p>
    </div>
    <div className="rounded-lg border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
      <p className="text-[13px] text-slate-700"><span className="font-semibold text-slate-900">Why does it happen? </span>{reason}</p>
    </div>
    <div>
      <p className="text-[13px] font-semibold text-slate-900 mb-1">Real-Life Example</p>
      <p>{example}</p>
    </div>
    {flow && (
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">Visual Understanding</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-medium">
          {flow.map((f, i) => (
            <React.Fragment key={i}>
              <FlowChip>{f}</FlowChip>
              {i < flow.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-400" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    )}
    {visualBefore && visualAfter && (
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-medium">{visualTitle || 'Visual Understanding'}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Before</p>
            <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
              {visualBefore.map((row, i) => (
                <div key={i} className="px-3 py-2 text-[12px] text-slate-700 border-b last:border-b-0 border-slate-100">{row}</div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1.5">After</p>
            <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
              {visualAfter.map((row, i) => (
                <div key={i} className={cn('px-3 py-2 text-[12px] border-b last:border-b-0 border-slate-100', row.toLowerCase().includes('sludge') ? 'bg-amber-50 text-amber-800 font-medium' : 'text-slate-700')}>{row}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    <div>
      <p className="text-[13px] font-semibold text-slate-900 mb-2">Engineering Applications</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {applications.map((a) => (
          <div key={a} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-700">{a}</div>
        ))}
      </div>
    </div>
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
      <p className="text-[13px] text-slate-700"><span className="font-semibold text-amber-800">Important Note · </span>{note}</p>
    </div>
  </div>
  );
}

/* ---------- Subcomponents ---------- */

const Section: React.FC<{ number: string; title: string; icon: React.ElementType; children: React.ReactNode }> = ({
  number, title, icon: Icon, children,
}) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] font-mono font-medium text-slate-400">{number}</span>
      <Icon className="h-3.5 w-3.5 text-blue-600" />
      <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
    {children}
  </section>
);

const FlowChip: React.FC<{ children: React.ReactNode; tone?: 'warn' }> = ({ children, tone }) => (
  <span
    className={cn(
      'px-3 py-1.5 rounded-md border text-[13px] font-medium',
      tone === 'warn'
        ? 'bg-amber-50 border-amber-200 text-amber-800'
        : 'bg-white border-slate-200 text-slate-700'
    )}
  >
    {children}
  </span>
);

const VisualCard: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
    <div className="aspect-video bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center border-b border-slate-200">
      <Eye className="h-8 w-8 text-slate-300" />
    </div>
    <div className="p-3">
      <p className="text-[13px] font-semibold text-slate-900">{title}</p>
      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
    </div>
  </div>
);

/* ---------- Toolkit ---------- */

const ToolkitPanel: React.FC<{
  activeTab: ToolkitTab;
  setActiveTab: (t: ToolkitTab) => void;
  search: string;
  setSearch: (s: string) => void;
  onOpenAi: () => void;
}> = ({ activeTab, setActiveTab, search, setSearch, onOpenAi }) => (
  <>
    <div className="px-4 pt-4 pb-3 border-b border-slate-200 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-900">Study Toolkit</h3>
        <Button size="sm" className="h-7 gap-1.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white" onClick={onOpenAi}>
          <Sparkles className="h-3 w-3" /> AI Mentor
        </Button>
      </div>
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search toolkit..."
          className="h-8 pl-8 text-xs border-slate-200 bg-slate-50/50 focus-visible:ring-blue-500"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {toolkitTabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition',
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200'
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
    <ScrollArea className="flex-1">
      <div className="p-3.5">
        <ToolkitContent tab={activeTab} />
      </div>
    </ScrollArea>
  </>
);

const ToolkitContent: React.FC<{ tab: ToolkitTab }> = ({ tab }) => {
  switch (tab) {
    case 'revision':
      return (
        <div className="space-y-2">
          {[
            'Hardness is caused by Ca²⁺ and Mg²⁺ ions in water.',
            'Two types: Temporary (bicarbonates) & Permanent (chlorides/sulphates).',
            'Measured in ppm of CaCO₃ equivalent.',
            'Removed by boiling, lime-soda, or ion-exchange methods.',
          ].map((p, i) => (
            <div key={i} className="flex gap-2 rounded-md bg-white border border-slate-200 p-2.5">
              <span className="text-[11px] text-blue-600 font-semibold shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[12px] leading-relaxed text-slate-700">{p}</span>
            </div>
          ))}
        </div>
      );
    case 'points':
      return (
        <ul className="space-y-1.5 text-[12px] text-slate-700">
          {[
            'Standard unit: ppm (parts per million)',
            'CaCO₃ equivalent is universal reference',
            'Temporary hardness = boiling removes it',
            'EDTA method is most accurate measurement',
          ].map((p) => (
            <li key={p} className="flex gap-2 rounded-md bg-white border border-slate-200 px-2.5 py-2">
              <span className="text-blue-500">•</span>{p}
            </li>
          ))}
        </ul>
      );
    case 'formulas':
      return (
        <div className="space-y-2">
          {[
            { f: 'Hardness (ppm)', e: '(mass of salt × 100) / molecular weight' },
            { f: 'CaCO₃ Equivalent', e: 'Mass × (100 / Mol. Wt of salt)' },
            { f: 'Degree (°Clark)', e: '1 grain CaCO₃ per gallon' },
          ].map((x) => (
            <div key={x.f} className="rounded-md bg-white border border-slate-200 p-2.5">
              <p className="text-[12px] font-semibold text-slate-900">{x.f}</p>
              <p className="text-[11px] font-mono text-slate-500 mt-1">{x.e}</p>
            </div>
          ))}
        </div>
      );
    case 'mindmap':
      return (
        <div className="space-y-1 text-[12px] text-slate-700">
          <Node label="Hardness of Water">
            <Node label="Types">
              <Node label="Temporary" />
              <Node label="Permanent" />
            </Node>
            <Node label="Measurement">
              <Node label="EDTA Method" />
              <Node label="O. Hehner's" />
            </Node>
            <Node label="Removal">
              <Node label="Boiling" />
              <Node label="Lime-Soda" />
              <Node label="Ion Exchange" />
            </Node>
          </Node>
        </div>
      );
    case 'mistakes':
      return (
        <div className="space-y-2 text-[12px]">
          {[
            'Confusing ppm with mg/L conversion when not equal.',
            'Forgetting buffer in EDTA titration — wrong end point.',
            'Mixing up temporary vs permanent removal methods.',
          ].map((m) => (
            <div key={m} className="rounded-md border border-amber-200 bg-amber-50/60 text-amber-900 p-2.5">
              {m}
            </div>
          ))}
        </div>
      );
    case 'tricks':
      return (
        <div className="space-y-2 text-[12px]">
          <div className="rounded-md border border-slate-200 bg-white p-2.5">
            <p className="font-semibold text-slate-900">"BC for Boiling, CS for Chemical"</p>
            <p className="text-slate-500 mt-1">BiCarbonates → Boil. Chlorides/Sulphates → Chemical.</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-2.5">
            <p className="font-semibold text-slate-900">CaMg = Hardness twins</p>
            <p className="text-slate-500 mt-1">Always remember Ca²⁺ &amp; Mg²⁺ as the culprits.</p>
          </div>
        </div>
      );
    case 'viva':
      return (
        <div className="space-y-2 text-[12px]">
          {[
            { q: 'What is hardness of water?', a: 'Property preventing soap from lathering due to dissolved Ca/Mg salts.' },
            { q: 'Why is hardness expressed as CaCO₃?', a: 'It is the most common reference standard with molecular weight 100.' },
            { q: 'Name two methods of softening.', a: 'Lime-Soda process and Ion-Exchange (Zeolite) process.' },
          ].map((v) => (
            <div key={v.q} className="rounded-md border border-slate-200 bg-white p-2.5">
              <p className="font-semibold text-slate-900">Q. {v.q}</p>
              <p className="text-slate-500 mt-1">A. {v.a}</p>
            </div>
          ))}
        </div>
      );
  }
};

const Node: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
  <div className="pl-3 border-l border-slate-200 ml-1">
    <p className="py-0.5 font-medium text-slate-700">{label}</p>
    {children && <div className="ml-1">{children}</div>}
  </div>
);

/* ---------- AI Mentor ---------- */

const AIMentorPanel: React.FC<{
  topic: string;
  messages: { id: number; text: string; isUser: boolean }[];
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  onClose: () => void;
}> = ({ topic, messages, input, setInput, onSend, onClose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-blue-50 flex items-center justify-center border border-blue-100">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 leading-none">AI Mentor</p>
            <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[180px]">Topic · {topic}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef as any} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex gap-2', m.isUser && 'flex-row-reverse')}>
            <div className={cn(
              'h-6 w-6 rounded-md flex items-center justify-center shrink-0 border',
              m.isUser ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-blue-50 border-blue-100'
            )}>
              {m.isUser ? <span className="text-[10px] font-semibold">U</span> : <Bot className="h-3.5 w-3.5 text-blue-600" />}
            </div>
            <div className={cn(
              'rounded-lg px-3 py-2 text-[12px] max-w-[80%] leading-relaxed',
              m.isUser ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            )}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-3 pt-2 border-t border-slate-200 bg-white">
        <div className="flex flex-wrap gap-1 mb-2">
          {aiQuickActions.map((a) => (
            <button
              key={a}
              onClick={() => onSend(a)}
              className="text-[10px] px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition"
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend(input)}
            placeholder="Ask anything..."
            className="h-8 text-xs border-slate-200 focus-visible:ring-blue-500"
          />
          <Button size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-700" onClick={() => onSend(input)}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
};

export {
  HardnessOfWaterArticle,
  FluorideManagementArticle,
  WaterSofteningArticle,
  DesalinationArticle,
  BoilerTroublesArticle,
  BatteryTechnologyArticle,
  FuelSolarCellsArticle,
  CorrosionPrinciplesArticle,
  CorrosionControlArticle,
  Section,
  StageBlock,
  FlowChip
};
