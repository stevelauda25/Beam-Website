import styles from './HeroVisual.module.css';

const beamGlyphPaths = [
  'M155.584 27.1434C156.154 27.707 156.154 28.6177 155.584 29.1813L154.716 30.0408C154.714 30.042 154.713 30.0436 154.711 30.0453C154.706 30.0498 154.704 30.0514 154.705 30.0507L154.7 30.0544L154.696 30.0587C154.325 30.4114 153.686 30.1877 153.617 29.6819C153.607 29.6067 153.599 29.5291 153.593 29.4535V29.4531L153.584 29.3421C153.515 28.2291 153.857 27.0939 154.613 26.1821L155.584 27.1434Z',
  'M155.266 25.5316C156.218 24.7607 157.409 24.4247 158.571 24.5239L158.572 24.524C158.65 24.5301 158.727 24.5382 158.805 24.5484V24.5483C159.317 24.6172 159.544 25.2545 159.187 25.614L159.148 25.652V25.6541L158.286 26.5074C157.734 27.0539 156.844 27.0627 156.279 26.5329L156.252 26.5073L155.266 25.5316Z',
  'M159.838 26.3084C160.347 25.8043 161.143 25.7494 161.714 26.1511C162.368 26.9311 162.721 27.8785 162.768 28.8362V28.8371C162.778 29.014 162.776 29.1913 162.764 29.369V29.3693C162.702 30.2859 162.359 31.1871 161.738 31.9383L158.975 29.2042C158.406 28.6405 158.406 27.7257 158.975 27.1621L159.838 26.3084Z',
  'M156.262 29.8487C156.832 29.285 157.752 29.285 158.322 29.8487L161.087 32.5852C160.327 33.2026 159.416 33.541 158.489 33.602H158.488C158.309 33.6143 158.129 33.6163 157.951 33.6061H157.95C156.982 33.5593 156.027 33.2108 155.239 32.5628C154.833 31.9976 154.884 31.2104 155.395 30.7067L156.262 29.8487Z',
];

const folders = [
  { name: 'Folder 001', count: 4, active: true },
  { name: 'Website assets', count: 88 },
  { name: 'Project boilerplate', count: 92 },
];

const files = [
  { name: 'Folder 001', badge: 'Starter', size: '2.4KB', modified: '5 days ago' },
  { name: 'Product Resources', size: '856MB', modified: '5 days ago' },
  { name: 'Website Assets', size: '420MB', modified: '6 days ago' },
];

const stats = [
  ['Folders', '3'],
  ['Files', '10'],
  ['Storage used', '1,276 MB'],
];

function BeamGlyph() {
  return (
    <svg viewBox="152.582 23.5214 11.1194 11.1194" aria-hidden="true">
      {beamGlyphPaths.map((path) => (
        <path d={path} fill="currentColor" key={path} />
      ))}
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="152.582 55.347 11.1194 11.1194" aria-hidden="true">
      <path d="M159.672 62.4372L162.543 65.3078" />
      <path d="M157.215 63.455C159.134 63.455 160.689 61.8993 160.689 59.9802C160.689 58.0611 159.134 56.5054 157.215 56.5054C155.295 56.5054 153.74 58.0611 153.74 59.9802C153.74 61.8993 155.295 63.455 157.215 63.455Z" />
    </svg>
  );
}

function FolderPlusIcon() {
  return (
    <svg viewBox="152.582 79.76 11.1194 11.1194" aria-hidden="true">
      <path d="M155.13 82.3081H157.783L157.507 81.7188C157.278 81.2304 156.788 80.9182 156.249 80.9182H154.666C153.899 80.9182 153.276 81.5409 153.276 82.3081V84.1613C153.276 83.1374 154.106 82.3081 155.13 82.3081Z" fill="currentColor" stroke="none" />
      <path d="M163.006 87.8678H159.299M161.153 89.7209V86.0145" />
      <path d="M153.276 84.1613V82.3081C153.276 81.5405 153.899 80.9182 154.666 80.9182H156.25C156.797 80.9182 157.293 81.2386 157.518 81.737L157.665 82.0642" />
      <path d="M163.006 84.6246V84.1613C163.006 83.1377 162.176 82.308 161.153 82.308H155.13C154.106 82.308 153.276 83.1377 153.276 84.1613V87.4044C153.276 88.4279 154.106 89.2577 155.13 89.2577H157.446" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="219.82 23.5214 11.1194 11.1194" aria-hidden="true">
      <path d="M220.979 27.9234L225.38 31.1666L229.781 27.9234" />
    </svg>
  );
}

function SidebarToggleIcon() {
  return (
    <svg viewBox="311.345 23.5212 11.1194 11.1194" aria-hidden="true">
      <path d="M313.893 33.0194H319.916C320.939 33.0194 321.769 32.1897 321.769 31.1662V26.9964C321.769 25.9729 320.939 25.1432 319.916 25.1432H313.893C312.869 25.1432 312.04 25.9729 312.04 26.9964V31.1662C312.04 32.1897 312.869 33.0194 313.893 33.0194Z" />
      <path d="M314.356 27.4594V30.7025" />
    </svg>
  );
}

function SearchSurface() {
  return (
    <svg className={styles.searchSurface} viewBox="0 0 184.708 25.3396" aria-hidden="true">
      <g filter="url(#hero-search-filter)">
        <rect y="0.4633" width="184.708" height="24.4129" rx="3.70647" fill="white" />
        <rect x="0.2317" y="0.695" width="184.245" height="23.9496" rx="3.47481" stroke="black" strokeOpacity="0.2" strokeWidth="0.463308" />
      </g>
      <defs>
        <filter id="hero-search-filter" x="0" y="0" width="184.708" height="25.3396" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feMorphology radius="0.926617" operator="erode" in="SourceAlpha" result="dropAlpha" />
          <feOffset dy="0.463308" />
          <feGaussianBlur stdDeviation="0.463308" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend in2="BackgroundImageFix" result="drop" />
          <feBlend in="SourceGraphic" in2="drop" result="shape" />
          <feOffset dy="-0.463308" />
          <feGaussianBlur stdDeviation="0.231654" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend in2="shape" result="innerTop" />
          <feOffset dy="0.463308" />
          <feGaussianBlur stdDeviation="0.231654" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
          <feBlend in2="innerTop" />
        </filter>
      </defs>
    </svg>
  );
}

export function HeroVisual() {
  return (
    <svg
      className={styles.visual}
      viewBox="0 0 1440 540"
      width="1440"
      height="540"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Beam file manager hero key visual"
    >
      <g opacity="0.9">
        <rect width="1440" height="540" fill="#FAFAFA" />
        <rect x="132" width="1176" height="680.661" rx="11.5107" fill="url(#hero-frame)" fillOpacity="0.04" />
        <rect x="137.49" y="5.48961" width="1164.56" height="669.682" rx="5.75533" fill="white" />

        <foreignObject x="137.49" y="5.48961" width="1164.56" height="669.682" clipPath="url(#hero-app-clip)">
          <div className={styles.app}>
            <aside className={styles.sidebar}>
              <div className={styles.workspace}>
                <span className={styles.beamGlyph}><BeamGlyph /></span>
                <span>Personal</span>
                <span className={styles.chevron}><ChevronIcon /></span>
                <span className={styles.sidebarToggle}><SidebarToggleIcon /></span>
              </div>

              <div className={styles.search}>
                <SearchSurface />
                <span className={styles.searchIcon}><SearchIcon /></span>
                <span className={styles.placeholder}>Search all files</span>
                <kbd><svg viewBox="0 0 10.1928 10.1928" aria-hidden="true"><path d="M3.243 8.8032L5.997 1.3902H6.95L4.196 8.8032H3.243Z" /></svg></kbd>
              </div>

              <div className={styles.newFolder}>
                <span className={styles.folderIcon}><FolderPlusIcon /></span>
                <span>New folder</span>
              </div>

              <nav className={styles.folderList} aria-label="Folders">
                {folders.map((folder) => (
                  <div className={folder.active ? styles.folderActive : styles.folderRow} key={folder.name}>
                    <span>{folder.name}</span>
                    <span>{folder.count}</span>
                  </div>
                ))}
              </nav>
            </aside>

            <section className={styles.content}>
              <div className={styles.title}>My Beam</div>
              <div className={styles.fileTable} role="table" aria-label="My Beam files">
                <div className={`${styles.fileRow} ${styles.fileHeader}`} role="row">
                  <span role="columnheader">Name</span>
                  <span role="columnheader">Size</span>
                  <span role="columnheader">Modified</span>
                  <span />
                </div>
                {files.map((file) => (
                  <div className={styles.fileRow} role="row" key={file.name}>
                    <span className={styles.fileName} role="cell">
                      {file.name}
                      {file.badge && <span className={styles.badge}>{file.badge}</span>}
                    </span>
                    <span role="cell">{file.size}</span>
                    <span role="cell">{file.modified}</span>
                    <span className={styles.ellipsis} role="cell">•••</span>
                  </div>
                ))}
              </div>

              <div className={styles.stats}>
                {stats.map(([label, value]) => (
                  <div className={styles.statRow} key={label}>
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </foreignObject>

        <rect y="264" width="1440" height="276" fill="url(#hero-fade)" />
      </g>

      <defs>
        <clipPath id="hero-app-clip">
          <rect x="137.49" y="5.48961" width="1164.56" height="669.682" rx="5.75533" />
        </clipPath>
        <linearGradient id="hero-frame" x1="132" y1="0" x2="1181.55" y2="860.416" gradientUnits="userSpaceOnUse">
          <stop />
          <stop offset="1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-fade" x1="720" y1="264" x2="720" y2="540" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FAFAFA" stopOpacity="0" />
          <stop offset="0.660644" stopColor="#FAFAFA" />
        </linearGradient>
      </defs>
    </svg>
  );
}
