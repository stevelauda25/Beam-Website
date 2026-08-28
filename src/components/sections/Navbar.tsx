import beamLogo from '../../assets/icons/beam-logo.svg';

export default function Navbar() {
  return (
    <nav className="w-full bg-[#fafafa] px-8 py-3 lg:px-[132px]">
      <div className="mx-auto flex max-w-[1176px] items-center justify-between">
        <a href="#" className="flex items-center gap-[5px]">
          <img
            src={beamLogo}
            alt=""
            className="h-[18.7px] w-[18.7px]"
            width={18.7}
            height={18.7}
          />
          <span className="text-[16.667px] font-semibold tracking-[-0.83px] text-text-primary">
            Beam
          </span>
        </a>

        <div className="flex items-center gap-3">
          <a
            href="#"
            className="text-[14px] font-normal leading-[20px] text-[#353331] transition hover:text-text-primary"
          >
            Signup
          </a>
          <a
            href="#"
            className="rounded-full border-[0.5px] border-black/10 bg-[#fafafa] px-3 py-2 text-[14px] font-normal text-black shadow-button transition hover:bg-canvas"
          >
            Login
          </a>
        </div>
      </div>
    </nav>
  );
}
