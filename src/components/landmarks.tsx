// A landmark silhouette for each language the partner speaks, set into the
// dusk skyline behind a conversation. Each is drawn in the same 340×400 box
// with its base on y = 400, so the scene can place any of them in one spot.

const STONE = "#8A6636";
const SHADE = "#5E4224";
const FAR = "#7E5B2F";
const LIT = "#E0A85C";
const LIT_FAR = "#D9A24E";

function Window({ x, y, w = 14, h = 30 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={w / 2} fill={LIT} />;
}

// Spain: a cathedral with its bell tower, as in the original design.
function Cathedral() {
  return (
    <>
      <g fill={STONE}>
        <path d="M76 66 L82 20 L88 66 Z" />
        <path d="M44 120 C 44 92 56 76 82 66 C 108 76 120 92 120 120 Z" />
        <rect x="40" y="114" width="84" height="286" />
        <path d="M26 170 L32 136 L38 170 Z" />
        <path d="M126 170 L132 136 L138 170 Z" />
        <rect x="16" y="166" width="30" height="234" />
        <rect x="118" y="166" width="30" height="234" />
      </g>
      <path d="M40 114 L82 90 L124 114 Z" fill={SHADE} />
      <Window x={56} y={156} w={16} h={34} />
      <Window x={92} y={156} w={16} h={34} />
      <Window x={58} y={236} />
      <Window x={92} y={236} />
      <Window x={22} y={248} w={12} h={26} />
      <Window x={126} y={248} w={12} h={26} />
      <g fill={FAR}>
        <path d="M288 202 L294 166 L300 202 Z" />
        <path d="M268 242 C 268 222 276 210 294 202 C 312 210 320 222 320 242 Z" />
        <rect x="266" y="238" width="56" height="162" />
      </g>
      <rect x="278" y="274" width="13" height="28" rx="6.5" fill={LIT_FAR} />
      <rect x="298" y="274" width="13" height="28" rx="6.5" fill={LIT_FAR} />
    </>
  );
}

// France: the Eiffel Tower beside a Paris mansard block.
function EiffelTower() {
  return (
    <>
      <g fill={STONE}>
        <rect x="148" y="0" width="4" height="24" />
        <path d="M150 20 L156 60 L166 150 L184 240 L212 330 L262 400 L210 400 C 196 356 104 356 90 400 L38 400 L88 330 L116 240 L134 150 L144 60 Z" />
      </g>
      <g fill={SHADE}>
        <rect x="80" y="322" width="140" height="10" />
        <rect x="108" y="234" width="84" height="8" />
        <rect x="136" y="148" width="28" height="6" />
      </g>
      <g fill={LIT}>
        {[[118, 336], [146, 338], [174, 336], [128, 250], [164, 250], [148, 160]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" />
        ))}
      </g>
      <g fill={FAR}>
        <path d="M252 318 L264 288 L324 288 L336 318 Z" />
        <rect x="252" y="318" width="84" height="82" />
      </g>
      <g fill={LIT_FAR}>
        <rect x="264" y="296" width="9" height="14" rx="2" />
        <rect x="290" y="296" width="9" height="14" rx="2" />
        <rect x="316" y="296" width="9" height="14" rx="2" />
        <rect x="264" y="334" width="10" height="20" rx="2" />
        <rect x="290" y="334" width="10" height="20" rx="2" />
        <rect x="316" y="334" width="10" height="20" rx="2" />
      </g>
    </>
  );
}

// Italy: Florence's Duomo and Giotto's bell tower.
function Duomo() {
  return (
    <>
      <g fill={STONE}>
        <path d="M126 44 L130 26 L134 44 Z" />
        <rect x="122" y="44" width="16" height="30" />
        <path d="M44 250 C 44 150 100 88 130 74 C 160 88 216 150 216 250 Z" />
        <rect x="34" y="248" width="192" height="40" />
        <rect x="0" y="286" width="262" height="114" />
      </g>
      <g fill={SHADE}>
        <path d="M130 74 L130 250" stroke={SHADE} strokeWidth="3" />
        <path d="M86 110 C 72 150 66 200 66 250 L74 250 C 74 200 80 150 92 112 Z" />
        <path d="M174 110 C 188 150 194 200 194 250 L186 250 C 186 200 180 150 168 112 Z" />
        <path d="M0 286 L131 262 L262 286 Z" />
      </g>
      <Window x={60} y={258} w={12} h={22} />
      <Window x={124} y={258} w={12} h={22} />
      <Window x={188} y={258} w={12} h={22} />
      <Window x={40} y={318} />
      <Window x={112} y={318} w={36} h={48} />
      <Window x={206} y={318} />
      <g fill={FAR}>
        <rect x="270" y="80" width="46" height="320" />
        <rect x="264" y="72" width="58" height="12" />
      </g>
      <g fill={LIT_FAR}>
        <rect x="286" y="104" width="14" height="36" rx="7" />
        <rect x="286" y="176" width="14" height="30" rx="7" />
        <rect x="286" y="240" width="14" height="30" rx="7" />
      </g>
    </>
  );
}

// Germany: the Brandenburg Gate with the Berlin TV tower behind it.
function BrandenburgGate() {
  return (
    <>
      <g fill={FAR}>
        <rect x="258" y="0" width="4" height="70" />
        <rect x="254" y="60" width="12" height="340" />
        <circle cx="260" cy="104" r="22" />
      </g>
      <circle cx="260" cy="104" r="6" fill={LIT_FAR} />
      <g fill={STONE}>
        <path d="M144 214 L150 196 L160 204 L168 190 L176 204 L186 196 L192 214 Z" />
        <rect x="110" y="214" width="116" height="34" />
        <rect x="10" y="246" width="316" height="36" />
        {[20, 74, 128, 190, 244, 298].map((x) => (
          <rect key={x} x={x} y="282" width="18" height="118" />
        ))}
      </g>
      <rect x="10" y="276" width="316" height="6" fill={SHADE} />
      <g fill={LIT} fillOpacity="0.5">
        {[38, 92, 146, 208, 262].map((x, index) => (
          <rect key={x} x={x + 4} y="292" width={index === 2 ? 36 : 28} height="108" rx="3" />
        ))}
      </g>
    </>
  );
}

// Portugal: Belém Tower and the 25 de Abril bridge over the Tagus.
function BelemTower() {
  return (
    <>
      <g stroke={FAR} strokeWidth="3" fill="none">
        <path d="M290 110 C 300 190 318 250 340 290" />
        <path d="M290 110 C 280 190 250 250 200 290" />
      </g>
      <g fill={FAR}>
        <rect x="282" y="104" width="6" height="296" />
        <rect x="292" y="104" width="6" height="296" />
        <rect x="280" y="160" width="20" height="5" />
        <rect x="190" y="288" width="150" height="7" />
      </g>
      <g fill={STONE}>
        <rect x="70" y="140" width="112" height="260" />
        <rect x="20" y="300" width="212" height="100" />
        {[70, 92, 114, 136, 158].map((x) => (
          <rect key={x} x={x} y="126" width="14" height="16" />
        ))}
        <path d="M60 150 C 60 128 80 128 80 150 Z" />
        <path d="M172 150 C 172 128 192 128 192 150 Z" />
        {[20, 46, 72, 180, 206].map((x) => (
          <rect key={x} x={x} y="288" width="16" height="14" />
        ))}
      </g>
      <rect x="70" y="222" width="112" height="6" fill={SHADE} />
      <Window x={96} y={170} w={16} h={34} />
      <Window x={140} y={170} w={16} h={34} />
      <Window x={116} y={244} w={20} h={40} />
      <Window x={46} y={330} />
      <Window x={192} y={330} />
    </>
  );
}

// England: Big Ben's tower and Tower Bridge.
function BigBen() {
  return (
    <>
      <g fill={STONE}>
        <path d="M88 0 L92 0 L92 30 L88 30 Z" />
        <path d="M62 96 L90 24 L118 96 Z" />
        <rect x="64" y="94" width="52" height="30" />
        <rect x="58" y="122" width="64" height="66" />
        <rect x="64" y="186" width="52" height="214" />
      </g>
      <circle cx="90" cy="155" r="21" fill={LIT} />
      <g stroke={SHADE} strokeWidth="2.4" strokeLinecap="round">
        <path d="M90 155 L90 142" />
        <path d="M90 155 L99 159" />
      </g>
      <Window x={72} y={222} w={12} h={26} />
      <Window x={96} y={222} w={12} h={26} />
      <Window x={72} y={290} w={12} h={26} />
      <Window x={96} y={290} w={12} h={26} />
      <g fill={FAR}>
        <path d="M180 214 L200 174 L220 214 Z" />
        <rect x="180" y="212" width="40" height="188" />
        <path d="M290 214 L310 174 L330 214 Z" />
        <rect x="290" y="212" width="40" height="188" />
        <rect x="220" y="226" width="70" height="10" />
        <rect x="150" y="324" width="190" height="8" />
      </g>
      <g stroke={FAR} strokeWidth="3" fill="none">
        <path d="M150 300 C 162 280 172 250 180 230" />
      </g>
      <g fill={LIT_FAR}>
        <rect x="193" y="240" width="14" height="26" rx="7" />
        <rect x="303" y="240" width="14" height="26" rx="7" />
      </g>
    </>
  );
}

const LANDMARKS: Record<string, () => React.JSX.Element> = {
  es: Cathedral,
  fr: EiffelTower,
  it: Duomo,
  de: BrandenburgGate,
  pt: BelemTower,
  en: BigBen,
};

/** The landmark for a language, drawn with its base at the given point. */
export function Landmark({
  code,
  x,
  baseline,
  scale = 1,
}: {
  code: string;
  x: number;
  baseline: number;
  scale?: number;
}) {
  const Shape = LANDMARKS[code] ?? Cathedral;
  return (
    <g transform={`translate(${x} ${baseline - 400 * scale}) scale(${scale})`}>
      <Shape />
    </g>
  );
}
