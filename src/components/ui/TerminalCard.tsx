import terminalHeader from '../../assets/icons/terminal-header.svg';
import terminalCopy from '../../assets/icons/terminal-copy.svg';
import terminalCheck from '../../assets/icons/terminal-check.svg';

export default function TerminalCard() {
  return (
    <div className="w-full max-w-[439px] rounded-[9px] bg-[#212121]">
      <div
        className="rounded-lg border-[0.5px] border-[rgba(255,255,255,0.13)] bg-[#292929] p-3"
        style={{
          boxShadow:
            '0px 9px 20px -6px rgba(0,0,0,0.5), inset 0px -0.5px 0.5px rgba(0,0,0,0.1)',
        }}
      >
        <div
          className="overflow-hidden rounded-[4px] border-[0.5px] border-[rgba(255,255,255,0.1)] bg-[#1f1f1f]"
          style={{
            boxShadow:
              '0px 1.415px 2.83px -1.415px rgba(0,0,0,0.1), 0px 11.319px 22.638px -8.489px rgba(0,0,0,0.04), inset 0px -0.707px 0.707px rgba(0,0,0,0.1)',
          }}
        >
          <div className="flex items-center border-b-[0.5px] border-black p-3">
            <img
              src={terminalHeader}
              alt=""
              className="h-[8.5px] w-auto"
              width={39}
              height={9}
            />
          </div>
          <div className="flex items-center gap-[5.115px] border-t-[0.5px] border-[#515151] bg-[#212121] p-3 pr-4 shadow-[inset_0_-0.707px_0.707px_rgba(0,0,0,0.1)]">
            <div className="flex min-w-0 flex-1 items-start gap-[8.5px] font-mono text-[14px] leading-[1.6] text-white">
              <span className="w-[17px] shrink-0 text-center text-[#0d76f2]">$</span>
              <span>beam mount ~/workspace</span>
            </div>
            <img
              src={terminalCopy}
              alt=""
              className="h-3.5 w-3.5 shrink-0"
              width={14}
              height={14}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-[10.229px] px-[14.23px] py-3 text-[14px] leading-[1.6] text-white">
        <div className="flex h-[17.049px] w-[17.049px] shrink-0 items-center justify-center">
          <img
            src={terminalCheck}
            alt=""
            className="h-[10.321px] w-[13.487px]"
            width={13.487}
            height={10.321}
          />
        </div>
        <span>workspace attached</span>
      </div>
    </div>
  );
}
