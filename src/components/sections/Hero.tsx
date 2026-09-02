import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button';
import FadeIn from '../ui/FadeIn';
import HeroKeyVisual from './HeroKeyVisual';
import arrowRight from '../../assets/icons/common/arrow-right.svg';
import claudeIcon from '../../assets/icons/agents/claude.svg';
import replitIcon from '../../assets/icons/agents/replit.svg';
import openaiIcon from '../../assets/icons/agents/openai.svg';

const AGENT_PROMPT =
  'Use Beam for this project\'s shared workspace. Help me connect this environment to Beam and verify that this agent can access the workspace.';

function AgentPromptButton() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const copyPrompt = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(AGENT_PROMPT);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = AGENT_PROMPT;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const didCopy = document.execCommand('copy');
        textarea.remove();
        if (!didCopy) throw new Error('Copy was rejected.');
      }

      setCopied(true);
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.warn('Unable to copy the Beam agent prompt.', error);
    }
  };

  return (
    <div className="shrink-0">
      <Button
        variant="secondary"
        onClick={copyPrompt}
        className="w-[236px] !gap-0 !px-[14px] !leading-none whitespace-nowrap"
      >
        <span className="flex items-center gap-1.5">
          {copied && <Check aria-hidden="true" className="h-3 w-3" />}
          {copied ? 'Prompt copied' : 'Copy agent prompt'}
        </span>
        <span className="mx-2.5 h-4 w-px bg-black/10" aria-hidden="true" />
        <span
          className="flex items-center gap-2 text-[#1c1f21]"
          aria-label="Compatible with popular coding agents"
        >
          <img src={claudeIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5" />
          <img src={replitIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5" />
          <img src={openaiIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Agent prompt copied to clipboard.' : ''}
      </span>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-[90svh] w-full bg-canvas">
      <div className="relative mx-auto flex max-w-[1176px] flex-col px-5 pb-16 pt-[92px] md:px-8 md:pb-8 md:pt-12 lg:h-[266px] lg:block lg:px-0 lg:py-0">
        <FadeIn>
          <div className="flex w-full max-w-[748px] flex-col gap-2 lg:absolute lg:left-0 lg:top-[103px]">
            <div className="flex flex-wrap items-center gap-[6px]">
              <span className="rounded-full bg-[#141414] px-1.5 py-0.5 text-[10px] font-normal text-white">
                SALE
              </span>
              <span className="flex items-center gap-1 text-[14px] font-normal leading-[14px] text-text-primary">
                Launch offer Get Pro for $10/month
                <img
                  src={arrowRight}
                  alt=""
                  className="h-3 w-3"
                  width={12}
                  height={12}
                />
              </span>
            </div>
            <h1 className="text-section font-normal text-text-primary">
              One workspace. Everywhere.
            </h1>
            <p className="max-w-[564px] text-[14px] leading-[1.4] text-[#3d3d3d] md:text-[16px] md:leading-[24px]">
              Beam keeps your files available across local machines, cloud
              environments, CI, and agent workflows without rebuilding context.
            </p>
          </div>
        </FadeIn>

        <FadeIn
          delay={0.1}
          className="mt-6 flex w-full items-center justify-center gap-3 lg:absolute lg:right-0 lg:top-[200px] lg:mt-0 lg:w-auto"
        >
          <AgentPromptButton />
          <Button
            variant="primary"
            href="#"
            className="min-w-0 flex-1 !px-[14px] !leading-none whitespace-nowrap lg:flex-none"
          >
            Start free
          </Button>
        </FadeIn>

      </div>

      <FadeIn delay={0.15} className="relative w-full">
        <div className="mx-auto w-full max-w-[1440px]">
          <HeroKeyVisual />
        </div>
      </FadeIn>
    </section>
  );
}
