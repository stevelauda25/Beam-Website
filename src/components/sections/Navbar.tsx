import beamLogo from '../../assets/brand/beam-logo.svg';
import Button from '../ui/Button';

export default function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 w-full bg-[#fafafa]/95 px-5 py-3 backdrop-blur-sm sm:px-8 min-[744px]:h-[52px] min-[744px]:py-0 lg:h-auto lg:px-[132px] lg:py-3">
      <div className="mx-auto flex h-full max-w-[1176px] items-center justify-between min-[744px]:w-[680px] lg:w-full">
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
          <Button
            variant="secondary"
            href="#"
            className="!px-[14px] !leading-none whitespace-nowrap min-[744px]:!h-[30px] min-[744px]:!py-0 lg:!h-auto lg:!py-2"
          >
            Login
          </Button>
        </div>
      </div>
    </nav>
  );
}
