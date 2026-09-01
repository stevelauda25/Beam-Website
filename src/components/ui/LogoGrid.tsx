import logoPlaceholder from '../../assets/icons/logo-grid/logo-placeholder.svg';
import quad1 from '../../assets/icons/logo-grid/quad1.svg';
import quad2 from '../../assets/icons/logo-grid/quad2.svg';
import quad3 from '../../assets/icons/logo-grid/quad3.svg';
import quad4 from '../../assets/icons/logo-grid/quad4.svg';

export default function LogoGrid() {
  const centerIndex = 19; // middle of the 13 x 3 grid

  return (
    <div className="absolute left-1/2 top-[-10px] flex -translate-x-1/2 flex-col gap-6">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex shrink-0 gap-6">
          {Array.from({ length: 13 }).map((_, col) => {
            const index = row * 13 + col;
            if (index === centerIndex) {
              return <CenterLogo key={index} />;
            }
            return (
              <div
                key={index}
                className="flex h-[88px] w-[88px] items-center justify-center rounded-[26px] p-1.5 opacity-40"
              >
                <img
                  src={logoPlaceholder}
                  alt=""
                  className="h-full w-full"
                  width={76}
                  height={76}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CenterLogo() {
  return (
    <div className="relative flex h-[88px] w-[88px] items-center justify-center rounded-[26px] border border-[#666] bg-[rgba(48,48,48,0.39)] p-1.5 shadow-[inset_-3px_-3px_4px_-2px_rgba(0,0,0,0.4),inset_3px_3px_1.5px_-2px_rgba(255,255,255,0.08)]">
      <div
        className="relative h-[76px] w-[76px] overflow-hidden rounded-[19.633px]"
        style={{
          background:
            'linear-gradient(160.5deg, rgb(83,83,83) 6.6%, rgb(34,34,34) 46.7%, rgb(27,27,27) 86.9%)',
        }}
      >
        <img
          src={quad1}
          alt=""
          className="absolute left-0 top-0 h-1/2 w-1/2"
          width={38}
          height={38}
        />
        <img
          src={quad2}
          alt=""
          className="absolute right-0 top-0 h-1/2 w-1/2"
          width={38}
          height={38}
        />
        <img
          src={quad3}
          alt=""
          className="absolute bottom-0 left-0 h-1/2 w-1/2"
          width={38}
          height={38}
        />
        <img
          src={quad4}
          alt=""
          className="absolute bottom-0 right-0 h-1/2 w-1/2"
          width={38}
          height={38}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-[19.633px]"
          style={{
            boxShadow:
              'inset 0 0 0 0.2px rgba(0,0,0,0.15), inset 0.2px 0.5px 0.5px rgba(255,255,255,0.6), inset 0 -0.5px 0.5px rgba(0,0,0,0.5)',
          }}
        />
      </div>
    </div>
  );
}
