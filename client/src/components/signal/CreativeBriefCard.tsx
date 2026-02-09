import { useState } from 'react';
import { clsx } from 'clsx';
import type { CreativeBrief } from '../../types';

interface CreativeBriefCardProps {
  brief: CreativeBrief;
  onExportMarkdown?: () => void;
  onCopy?: () => void;
}

export function CreativeBriefCard({ brief, onExportMarkdown, onCopy }: CreativeBriefCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = formatBriefAsText(brief);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-teal/10 to-brand-purple/10 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-brand-purple uppercase tracking-wide">
              Creative Brief
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              {brief.working_title}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              )}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {onExportMarkdown && (
              <button
                onClick={onExportMarkdown}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-brand-purple text-white hover:bg-brand-purple/90 transition-colors"
              >
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Core Insight */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Core Insight
          </h3>
          <p className="text-gray-900 text-lg leading-relaxed">
            {brief.core_insight}
          </p>
        </section>

        {/* Narrative Arc */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Narrative Arc
          </h3>
          <div className="space-y-3">
            <ArcItem label="Opening Tension" content={brief.narrative_arc.opening_tension} />
            {brief.narrative_arc.progression_beats.map((beat, i) => (
              <ArcItem key={i} label={`Progression ${i + 1}`} content={beat} />
            ))}
            <ArcItem label="Insight Crystallization" content={brief.narrative_arc.insight_crystallization} />
            <ArcItem label="Close" content={brief.narrative_arc.close} />
          </div>
        </section>

        {/* Intended Reader */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Intended Reader
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p><span className="font-medium text-gray-700">Who:</span> {brief.intended_reader.who}</p>
            <p><span className="font-medium text-gray-700">Struggling with:</span> {brief.intended_reader.struggling_with}</p>
            {brief.intended_reader.current_misunderstanding && (
              <p><span className="font-medium text-gray-700">Misunderstanding:</span> {brief.intended_reader.current_misunderstanding}</p>
            )}
          </div>
        </section>

        {/* What This Clarifies */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            What This Clarifies
          </h3>
          <ul className="space-y-1">
            {brief.what_this_clarifies.map((item, i) => (
              <li key={i} className="flex gap-2 text-gray-700">
                <span className="text-brand-teal">•</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Tone & Guardrails */}
        <section className="flex gap-6">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Tone
            </h3>
            <div className="flex flex-wrap gap-2">
              {brief.tone_and_guardrails.qualities.map((quality, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-brand-teal/10 text-brand-teal text-sm font-medium rounded-full"
                >
                  {quality}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Avoid
            </h3>
            <div className="flex flex-wrap gap-2">
              {brief.tone_and_guardrails.do_nots.map((item, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-red-50 text-red-600 text-sm font-medium rounded-full"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Key Language */}
        {brief.key_language_or_metaphors && brief.key_language_or_metaphors.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Key Language & Metaphors
            </h3>
            <div className="flex flex-wrap gap-2">
              {brief.key_language_or_metaphors.map((item, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-brand-purple/10 text-brand-purple text-sm font-medium rounded-full"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
        Generated in {brief.turns_to_complete} turns • {new Date(brief.generated_at).toLocaleDateString()}
      </div>
    </div>
  );
}

function ArcItem({ label, content }: { label: string; content: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-brand-purple/40" />
      <div>
        <span className="text-sm font-medium text-brand-purple">{label}:</span>
        <p className="text-gray-700 mt-0.5">{content}</p>
      </div>
    </div>
  );
}

function formatBriefAsText(brief: CreativeBrief): string {
  return `# ${brief.working_title}

## Core Insight
${brief.core_insight}

## Narrative Arc
- Opening Tension: ${brief.narrative_arc.opening_tension}
${brief.narrative_arc.progression_beats.map((b, i) => `- Progression ${i + 1}: ${b}`).join('\n')}
- Insight Crystallization: ${brief.narrative_arc.insight_crystallization}
- Close: ${brief.narrative_arc.close}

## Intended Reader
- Who: ${brief.intended_reader.who}
- Struggling with: ${brief.intended_reader.struggling_with}
${brief.intended_reader.current_misunderstanding ? `- Misunderstanding: ${brief.intended_reader.current_misunderstanding}` : ''}

## What This Clarifies
${brief.what_this_clarifies.map(c => `- ${c}`).join('\n')}

## Tone & Guardrails
- Qualities: ${brief.tone_and_guardrails.qualities.join(', ')}
- Avoid: ${brief.tone_and_guardrails.do_nots.join(', ')}
${brief.key_language_or_metaphors ? `\n## Key Language & Metaphors\n${brief.key_language_or_metaphors.map(m => `- ${m}`).join('\n')}` : ''}
`;
}
