import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
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
  const [isCopying, setIsCopying] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const labelTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const copyPrompt = async () => {
    setIsCopying(true);

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
      setIsCopying(false);
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      setIsCopying(false);
      console.warn('Unable to copy the Beam agent prompt.', error);
    }
  };

  return (
    <div className="shrink-0">
      <Button
        variant="secondary"
        onClick={copyPrompt}
        className={`agent-prompt-button h-[36px] w-[250px] overflow-hidden !gap-0 !px-[14px] !py-0 !leading-none whitespace-nowrap ${
          copied || isCopying ? 'is-copy-active' : ''
        }`}
      >
        <span
          className="relative h-5 w-[132px] flex-none overflow-hidden"
          aria-hidden="true"
        >
          <motion.span
            animate={
              copied
                ? { y: '-85%', opacity: 0, filter: 'blur(4px)' }
                : { y: '0%', opacity: 1, filter: 'blur(0px)' }
            }
            initial={false}
            transition={labelTransition}
            className="absolute inset-0 flex items-center justify-center"
          >
            Copy agent prompt
          </motion.span>
          <motion.span
            animate={
              copied
                ? { y: '0%', opacity: 1, filter: 'blur(0px)' }
                : { y: '85%', opacity: 0, filter: 'blur(4px)' }
            }
            initial={false}
            transition={labelTransition}
            className="absolute inset-0 flex items-center justify-center gap-1.5"
          >
            <Check className="h-3 w-3" />
            Prompt copied
          </motion.span>
        </span>
        <span
          className="mx-2.5 h-4 w-px bg-black/10"
          aria-hidden="true"
        />
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
    <section className="relative min-h-[90svh] w-full bg-canvas min-[744px]:flex min-[744px]:min-h-[calc(100svh-52px)] min-[744px]:flex-col min-[744px]:justify-center lg:block lg:min-h-[90svh]">
      <div className="relative mx-auto flex max-w-[1176px] flex-col px-5 pb-16 pt-[92px] md:px-8 md:pb-8 md:pt-12 min-[744px]:bottom-12 min-[744px]:w-[680px] min-[744px]:!px-0 lg:bottom-auto lg:h-[266px] lg:w-full lg:block lg:py-0">
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
          className="mt-6 flex w-full items-center justify-center gap-3 sm:justify-start lg:absolute lg:right-0 lg:top-[185px] lg:mt-0 lg:w-auto lg:justify-center"
        >
          <AgentPromptButton />
          <Button
            variant="primary"
            href="#"
            className="dark-button-interaction h-[34px] min-w-0 flex-1 !px-[14px] !py-0 !leading-none whitespace-nowrap lg:flex-none"
          >
            Start free
          </Button>
        </FadeIn>

      </div>

      <FadeIn delay={0.15} className="relative w-full min-[744px]:bottom-12 lg:bottom-auto">
        <div className="mx-auto w-full max-w-[1440px] min-[744px]:w-[680px] lg:w-full">
          <HeroKeyVisual />
        </div>
      </FadeIn>
    </section>
  );
}
