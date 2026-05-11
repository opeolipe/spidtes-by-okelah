/* ============================================================
   SPIDTES BY OKELAH™ — dictionary.js
   Massive Satirical Roast Dictionary (Multi-language)
   ============================================================ */

/**
 * Maps a browser language prefix to the expected ISO-3166-1 alpha-2
 * country code(s) for that language's primary region(s).
 */
const LOCALE_COUNTRY_MAP = {
  'id': ['ID'],
  'ms': ['MY', 'BN', 'SG'],
  'fil': ['PH'],
  'th': ['TH'],
  'vi': ['VN'],
  'km': ['KH'],
  'my': ['MM'],
  'lo': ['LA'],
  'ja': ['JP'],
  'ko': ['KR'],
  'zh': ['CN', 'TW', 'HK', 'MO', 'SG'],
  'de': ['DE', 'AT', 'CH'],
  'fr': ['FR', 'BE', 'CH', 'CA', 'LU'],
  'es': ['ES', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'CR', 'GT', 'HN', 'SV', 'NI', 'PA', 'DO', 'CU'],
  'pt': ['PT', 'BR', 'AO', 'MZ'],
  'ru': ['RU', 'BY', 'KZ'],
  'uk': ['UA'],
  'pl': ['PL'],
  'cs': ['CZ'],
  'sk': ['SK'],
  'hu': ['HU'],
  'ro': ['RO'],
  'bg': ['BG'],
  'hr': ['HR'],
  'sr': ['RS'],
  'sl': ['SI'],
  'nl': ['NL', 'BE'],
  'sv': ['SE'],
  'da': ['DK'],
  'fi': ['FI'],
  'nb': ['NO'],
  'nn': ['NO'],
  'tr': ['TR'],
  'ar': ['SA', 'AE', 'EG', 'IQ', 'MA', 'DZ', 'TN', 'LY', 'JO', 'LB', 'SY', 'YE', 'OM', 'KW', 'QA', 'BH'],
  'fa': ['IR', 'AF'],
  'he': ['IL'],
  'hi': ['IN'],
  'bn': ['BD', 'IN'],
  'ta': ['IN', 'LK'],
  'te': ['IN'],
  'mr': ['IN'],
  'ur': ['PK', 'IN'],
  'el': ['GR', 'CY'],
  'it': ['IT', 'CH'],
  'lt': ['LT'],
  'lv': ['LV'],
  'et': ['EE'],
  'ka': ['GE'],
  'hy': ['AM'],
  'az': ['AZ'],
  'uz': ['UZ'],
  'kk': ['KZ'],
};

/**
 * Overrides the browser-language locale with one derived from the IP's country code.
 */
const COUNTRY_LOCALE_MAP = {
  'ID': 'id-ID',
  'MY': 'id-ID', 'BN': 'id-ID',
};

const ROAST_DICT = {
  'id-ID': {
    uploadReact: [
      'Upload {upload} Mbps. Kirim foto ke gebetan aja perlu doa dulu.',
      'Upload {upload} Mbps — Google Drive-mu minta maaf duluan.',
      'Dengan upload {upload} Mbps, video call-mu bakal jadi pertunjukan piksel bergerak.',
      'Upload {upload} Mbps. Story Instagram-mu loading lebih lama dari kesabaranmu.',
      'Backup ke cloud dengan {upload} Mbps? Duduk dulu, ini bakalan lama.',
    ],
    jitterReact: [
      'Jitter ±{jitter}ms — koneksimu kayak jemuran kena angin kencang.',
      'Jitter ±{jitter}ms. Suaramu di Zoom pasti putus-putus kayak sinyal tahun 2000.',
      '±{jitter}ms jitter itu artinya internet-mu nggak stabil. Kayak mood mantan.',
      'Jitter-mu ±{jitter}ms. Main game online? Dijamin kena rubber band.',
      'Dengan jitter ±{jitter}ms, meeting online-mu pasti sering "halo? halo? masih ada?"',
    ],
    vpnRoast: [
      'Browser-mu Indo, IP-mu Amerika. Pake VPN gratisan ya bang? Kirain pro.',
      'Detected VPN. Sok internasional, padahal koneksinya tetep lemot.',
      'IP-mu abroad tapi ping-mu tetap nangis. VPN gratisan atau berbayar juga sama aja hasilnya.',
      'Pake VPN biar kelihatan keren. Speed-nya tetap bikin malu.',
      'VPN aktif, bandwidth tetap pingsan. Tunneling ke mana, bang?',
      'IP-mu keluar negeri tapi jiwa koneksinya masih di warnet pinggir jalan.',
      'Nyamar jadi bule di internet, tapi speed-nya masih ala kosan Rp800rb sebulan.',
      'VPN-nya bisa nyembunyiin lokasi. Nggak bisa nyembunyiin kenyataan ini.',
      'Encrypt traffic boleh. Tapi kekecewaan ini nggak bisa dienkripsi.',
      'Pakai VPN biar "aman". Aman dari siapa? Speed-mu tetap ketangkap basah.',
    ],
    pingReact: [
      "Ping {ping} ms. Ini main game apa nunggu balasan chat dari gebetan?",
      "Latency {ping} ms? Sinyalnya lagi mampir ngopi dulu ya?",
      "Ping {ping} ms itu bukan gaming, itu meditasi digital.",
      "Ping {ping} ms? Koneksi gini mending dipake buat mining batu bata aja.",
      'Ping-mu lebih tinggi dari harapan hidupmu.',
      'Dengan ping segitu, kamu udah kalah sebelum mulai.',
      'Ping {ping}ms? Paket internet-mu kayak kirim surat lewat kantor pos.',
      '{ping}ms. Itu bukan latency, itu penantian eksistensial.',
      'Ping {ping}ms bikin game online jadi catur pos.',
      'Dengan ping {ping}ms, musuh udah respawn sebelum peluru-mu nyampe.',
    ],
    speedReact: [
      "{speed} (siput mager) Mbps di 2025. Warnet tahun 2005 lebih kenceng dari ini.",
      "{speed} Mbps? Ini internet apa paket hemat kuota keluarga?",
      "Cuma dapet {speed} Mbps? Kecepatan segini mending buat kirim SMS aja.",
      "{speed} Mbps itu bukan speed, itu angka harapan hidup ISP-mu.",
      "Speedmu {speed} Mbps. Siput pun ngakak.",
      "{speed} Mbps? Kamu mau streaming atau meditasi?",
      'Bahkan IndiHome promo pun malu liat angka ini.',
      '{speed} Mbps. WhatsApp voice note aja nge-buffer.',
      'Kecepatan {speed} Mbps. Kenangan masa lalu load lebih cepet.',
      'Netflix minimum 3 Mbps buat 720p. Kamu di {speed} Mbps. Selamat nonton slideshow.',
    ],
    ispRoast: [
      {
        match: ['indihome', 'telkom indonesia', 'telkom', 'astinet'],
        lines: [
          'IndiHome, raja throttling nusantara. Mahal, lambat, tapi tetep dipake karena ga ada pilihan.',
          'IndiHome: karena monopoli itu nyata, dan kamu yang bayar ongkosnya.',
          'IndiHome FUP-nya kejam. Tanggal 20 speed langsung nyungsep ke dasar laut.',
          'Tagihan IndiHome naik tiap tahun. Speed-nya setia di angka yang sama.',
          'IndiHome: satu-satunya tempat di mana "gangguan jaringan" adalah fitur, bukan bug.',
        ]
      },
      {
        match: ['telkomsel', 'telekomunikasi selular', 'selular', 'tsel', 'orbit'],
        lines: [
          'Telkomsel Orbit katanya solusi rumahan. Solusi apa, bro? Solusi bikin emosi.',
          'Orbit by Telkomsel: harga langit, speed tanah.',
          'Telkomsel: provider terbesar Indonesia, dengan keluhan terbesar juga.',
          'Orbit sudah orbit ke mana-mana, tapi signal-nya masih di bumi bawah.',
        ]
      },
      {
        match: ['biznet'],
        lines: [
          'Biznet harusnya kenceng. Harusnya. Kenyataannya? Ya gini deh.',
          'Biznet di kertasnya 100Mbps. Di realitanya tanya tetangga yang sama kecewanya.',
          'Biznet Metro: metronya macet juga rupanya.',
          'Biznet fiber optik katanya. Fiber-nya mungkin masih digulung di gudang.',
        ]
      },
      {
        match: ['xl', 'axiata', 'xl satu'],
        lines: [
          'XL Axiata. X-nya buat X-tras lambat.',
          'XL: Xtra Lemot, eXtra kecewa.',
          'XL Satu Home — satu paket, satu kekecewaan terpadu.',
          'XL fiber sudah ada. Kamu pake XL yang mana, bang? Yang lemot juga?',
        ]
      },
      {
        match: ['myrepublic', 'republik'],
        lines: [
          'MyRepublic katanya gaming ISP. Gaming ISP buat gamer yang hobi DC.',
          'MyRepublic: republiknya mana? Yang ini kayak monarki disconnect.',
          'MyRepublic fiber gaming — gaming paling mulus adalah saat server down.',
        ]
      },
      {
        match: ['smartfren'],
        lines: [
          'Smartfren. Smart dari mana? Dari namanya doang.',
          'Smartfren: sinyal 4G, kecepatan nostalgia 2G.',
          'Smartfren WMS home broadband. W-nya untuk Waiting.',
          'Smartfren: satu-satunya provider yang bikin pengguna merasa lebih pintar setelah berhenti langganan.',
        ]
      },
      {
        match: ['first media', 'link net'],
        lines: ['First Media: first dalam harga, last dalam performa.', 'First Media fiber — first kali konek kenceng, abis itu silakan bersabar.']
      },
      {
        match: ['iconnet', 'pln'],
        lines: ['IconNet by PLN. Listrik bisa, internet... ya masih sesuai anggaran PLN.', 'IconNet: icon-nya bisa, net-nya masih loading.', 'PLN masuk bisnis internet. Mati lampu masuk bundel gratis.']
      },
      {
        match: ['mnc', 'mnc play'],
        lines: ['MNC Play. Main streaming di platform sendiri aja buffering, gimana yang lain.', 'MNC Play — media terbesar, bandwidth terkecil.']
      },
      {
        match: ['tri', 'hutchison', ' 3 '],
        lines: ['Tri/3 Hutchison. Nomor tiga dalam nama, nomor tiga dari bawah dalam kecepatan.', '3 Indonesia: unlimited data, unlimited kekecewaan.']
      },
      {
        match: ['axis'],
        lines: ['Axis Telekom. Udah merger sama XL, speed-nya pun ikut merge jadi satu: lambat.', 'Axis: dulu murah meriah, sekarang... tetap saja.']
      },
      {
        match: ['indosat', 'ooredoo', 'isat', 'im3'],
        lines: ['Indosat Ooredoo Hutchison. Tiga perusahaan bergabung, speed-nya tetap satu: biasa aja.', 'IM3 Ooredoo: rebranding keren, kecepatan original tetap terjaga.']
      },
      {
        match: ['fastly'],
        lines: ["Namanya aja 'Fastly', tapi koneksinya pelan banget. Ironic banget bang."]
      },
    ],
    ispRoastDefault: [
      '"{isp}" — baru denger namanya aja udah kecium bau-bau lemotnya.',
      '"{isp}" — provider antah berantah, kualitas juga entah ke mana.',
      '"{isp}" — mereka ada, tapi internet-nya kayak nggak ada.',
      'Belum pernah denger "{isp}", tapi liat speed-nya sih mending nggak usah denger lagi.',
      '"{isp}" ini apa singkatannya? Internet Sangat Tidak Enak?',
    ],
    deviceRoast: {
      iphone: "Beli iPhone sanggup, beli kuota kok pelit banget?",
      android: "HP-nya udah flagship, speed-nya masih ala warnet gembel.",
      desktop: "Monitor doang gede, bandwidth-nya sekecil harapan lulus tepat waktu."
    },
    locationRoast: {
      'denpasar': [
        'Denpasar, ibu kota Bali. Kota seni dan budaya. Internet-nya? Beda cerita.',
        'Digital nomad masuk Denpasar pake WiFi kosan Rp150rb. Vibes bagus, koneksi nangis.',
        'Denpasar — turis datang buat sunset. Kamu duduk nungguin halaman web yang load.',
      ],
      'bali': [
        'Work From Bali tapi WiFi kosan Rp150rb sebulan. Vibes bagus, koneksi ngenes.',
        'Digital nomad di Bali pake WiFi warung. Respek tapi ya... upload foto aja pake jalur darat.',
        'Bali surganya dunia. WiFi-nya surganya disconnected.',
        'Semua orang WFB — Work From Bali. Tapi yang "B" itu Buffer, bukan Beach.',
      ],
      'dalung': [
        'Dalung, Bali. Kosan WiFi patungan 6 orang. Speed dibagi rata: nol koma nol.',
        'Dalung: harga kosan naik, speed WiFi tetap di titik yang sama sejak 2017.',
      ],
      'kuta': ['Kuta, pantai paling rame di Bali. WiFi paling rame buffering-nya juga.', 'Kuta — turis ribuan, bandwidth ratusan kilobyte.'],
      'seminyak': ['Seminyak, area bule sultan. Internet-nya masih ala Bali pada umumnya: bisa nunggu.'],
      'ubud': ['Ubud, pusat seni dan spiritualitas. Internet-nya menguji kesabaran spiritual kamu.', 'Ubud: cocok buat healing, cocok juga buat detoks digital — karena internet-nya bikin kapok.'],
      'jakarta': [
        'Jakarta, ibu kota, tapi koneksinya masih kalah sama warnet 2008.',
        'DKI Jakarta: macetnya di jalan, macetnya di internet.',
        'Jakarta pusat ekonomi Indonesia. Ekonomi internet-mu? Jauh dari pusat.',
        'Tinggal di kota yang tidak pernah tidur, internet-mu yang malah tidur duluan.',
      ],
      'surabaya': [
        'Surabaya, kota pahlawan. Pahlawan yang ping-nya 300ms.',
        'Surabaya kota terbesar kedua. Internet-nya? Juga nomor dua. Dari bawah.',
        'Arek Suroboyo biasanya keras kepala. Internet-nya lebih keras: keras susah konek.',
      ],
      'bandung': [
        'Bandung kota kembang. Kembang kembali jadi dial-up ternyata.',
        'Silicon Valley-nya Indonesia katanya. Silicon iya, Valley speed-nya iya juga — turun terus.',
        'Bandung: startup-nya kenceng, internet rumahnya masih mengejar.',
      ],
      'yogyakarta': [
        'Jogja istimewa katanya. Istimewa lemotnya iya.',
        'Kota pelajar, tapi internet-nya bikin ilmu susah masuk.',
        'Malioboro ramai wisatawan. Router-mu juga ramai — ramai error.',
      ],
      'semarang': [
        'Semarang, kota lumpia. Internet-nya pun selembek lumpia basah.',
        'Semarang: Rob air laut naik tiap tahun. Kecepatan internet turun tiap bulan.',
        'Kota atlas ini bisa ngangkat banyak hal. Internet kenceng belum termasuk.',
      ],
      'medan': [
        'Medan, kota terbesar di Sumatra. Internet-nya masih kalah sama warung kopi di Jawa.',
        'Orang Medan terkenal keras and tegas. Coba tegas ke ISP-mu juga dong.',
        'Medan: kota sejuta durian, satu internet yang mengecewakan.',
      ],
      'makassar': [
        'Makassar, gerbang timur Indonesia. Gerbangnya buka, internet-nya masih tutup.',
        'Kota Daeng ini terkenal pemberani. Berani juga ya pake internet segini.',
        'Makassar punya bandara baru megah. Terminal internet-nya masih dalam renovasi.',
      ],
      'malang': [
        'Malang kota dingin dan sejuk. Koneksi internet-nya pun bikin hati dingin.',
        'Malang: kota apel dan pendidikan. Internet-nya bikin studi kasus sendiri.',
        'Kota Malang — nama kotanya tepat buat kondisi koneksi internet-mu.',
      ],
      'bogor': [
        'Bogor, kota hujan. Yang jelas bukan hujan bandwidth.',
        'Istana Bogor ada di sini. Istana ISP-mu? Sudah lama ambruk.',
        'Bogor satu jam dari Jakarta. Speed internet-nya satu dekade dari normal.',
      ],
      'depok': [
        'Depok. UI dan Gunadarma ada di sini. Ironi internet-nya sangat nyata.',
        'Kota satelit Jakarta ini punya banyak mahasiswa IT. Mereka semua ngerasain pedihnya internet-mu.',
        'Depok: smart city in progress. Progress-nya lagi istirahat rupanya.',
      ],
      'tangerang': [
        'Tangerang, kota industri di pintu masuk Jakarta. Industri apa? Industri lemot.',
        'BSD City ada di Tangerang. Kota baru, internet lama.',
        'Tangerang Selatan: kawasan elite, internet masih demokratis — lambat merata.',
      ],
      'bekasi': [
        'Bekasi. Udah jauh dari Jakarta, jauh juga dari kecepatan internet yang manusiawi.',
        'Orang Bekasi sering diledekin. Sekarang internet-nya ikut nimbrung.',
        'Bekasi: kemacetan kelas dunia, internet kelas RT/RW.',
      ],
      'palembang': [
        'Palembang, kota pempek. Internet-nya pun sama ngembangnya — penuh harapan, kurang eksekusi.',
        'Jembatan Ampera ikonik banget. Koneksi internet-mu juga ikonik: ikonik lemotnya.',
      ],
      'pekanbaru': [
        'Pekanbaru, kota minyak. Minyak banyak, bandwidth nggak ikut.',
        'Pekanbaru: SDA melimpah, SDM berkualitas. Internet-nya masih dalam pengembangan.',
      ],
      'balikpapan': [
        'Balikpapan, gerbang IKN. Ibukota baru mau dibangun, internet lama masih di sana.',
        'Kota minyak Kaltim ini siap masa depan. Internet-nya masih di masa lalu.',
      ],
      'pontianak': [
        'Pontianak, tepat di garis khatulistiwa. Sinyal-nya bingung mau ke utara atau selatan.',
        'Kota khatulistiwa ini punya posisi unik di peta. Internet-nya punya posisi unik juga: di bawah ekspektasi.',
      ],
      'manado': [
        'Manado, ujung utara Sulawesi. Signal-nya juga nyungsep ke arah utara.',
        'Bunaken terdekat dari sini. Sayangnya bandwidth-mu udah tenggelam lebih dalam.',
      ],
      'lombok': [
        'Lombok, surga wisata. Wisatawan datang, internet kabur ke gunung Rinjani.',
        'Pantai-pantai Lombok menakjubkan. WiFi-nya bikin takjub juga — takjub betapa lemotnya.',
      ],
      'default': [
        'Dimanapun kamu berada, satu hal yang pasti: ISP-mu mengecewakan.',
        'Kota-mu nggak ada di daftar, tapi internet segini mah bikin tetangga kasihan.',
        'Lokasi nggak dikenal, tapi kualitas internet-nya sangat dikenali: mengecewakan.',
        'Entah di mana kamu berada, ISP-mu sudah menemukan cara untuk kecewain kamu di sana.',
        'Nama kota-mu nggak ada, tapi rekam jejaknya ada: lambat.',
      ],
    },
    punchline: [
      'Semoga ISP-mu segera sadar diri.',
      'Hubungi customer service ISP-mu. Nanti deh, masih antri 3 jam.',
      'Ganti ISP atau ganti harapan. Dua-duanya valid.',
      'Coba restart router. Ga bakal ngaruh, tapi setidaknya ada usaha.',
      'Screenshot ini dan kirimin ke CS ISP-mu. Tanda kenangan.',
      'Upgrade paket internet-mu. Atau upgrade kesabaran-mu. Pilih salah satu.',
      'ISP-mu kayak mantan: janji manis, realitanya menghancurkan.',
      'Pro tip: matiin WiFi, pake data. Hasilnya? Tetap sama. Selamat.',
      'Kirim hasil ini ke grup keluarga. Biar ada yang sibuk ngurus internet kamu.',
      'Grafik speed-mu kayak grafik semangat hari Senin pagi: langsung turun.',
      'Buka tiket keluhan ke ISP-mu. Mereka akan bilang "sedang diperbaiki" seperti biasa.',
      'Sebenernya, warnet terdekat mungkin lebih kenceng. Pertimbangkan opsi itu.',
      'Ping-mu lebih tinggi dari ekspektasi, speed-mu lebih rendah dari harga paket.',
      'Coba ganti posisi router. Tetap nggak akan ngaruh, tapi lumayan buat olahraga.',
      'Lapor ke BRTI kalau mau. Antrinya lebih lama dari loading halaman web-mu.',
    ],
  },

  'en-US': {
    uploadReact: [
      'Upload speed: {upload} Mbps. I\'ve seen glaciers move faster than this.',
      'With {upload} Mbps upload, your cloud backups are more like cloud hopes.',
      '{upload} Mbps? Your outgoing packets are basically taking a gap year.',
      'Story of your life: waiting for {upload} Mbps to finish a 2MB upload.',
      'Your upload speed is a cry for help. Specifically, a {upload} Mbps cry.',
    ],
    jitterReact: [
      'Jitter ±{jitter}ms. Your connection is as stable as a house of cards in a hurricane.',
      '±{jitter}ms jitter? Your Zoom calls must sound like a remix nobody asked for.',
      'High jitter (±{jitter}ms) detected. Your packets are arriving in a random order, just like your life choices.',
      '±{jitter}ms — your connection is literally vibrating with inadequacy.',
    ],
    vpnRoast: [
      'Using a VPN? Stealth mode won\'t hide this tragic bandwidth.',
      'VPN detected. Privacy is great, but browsing at the speed of a carrier pigeon isn\'t.',
      'Nice tunnel. Too bad it\'s a tunnel to 1996.',
      'Masking your IP doesn\'t mask the fact that your internet is struggling.',
    ],
    pingReact: [
      "Ping: {ping} ms. You're living in the past. Literally.",
      "With {ping} ms latency, you're not playing the game, you're watching a history lesson.",
      "Your ping is {ping} ms. Are you communicating via satellite or smoke signals?",
      "Latency: {ping} ms. Even light speed gave up on you.",
      "Ping {ping} ms. Your packets are probably stopping for a coffee break.",
    ],
    speedReact: [
      "{speed} Mbps? I remember my first 56k modem too. Nostalgic.",
      "Is this internet or a carrier pigeon? Dial-up called, they want their latency back.",
      "{speed} Mbps. It's not a speed test, it's a patience test.",
      "Welcome to the fast lane! Just kidding, you're at {speed} Mbps.",
      "{speed} Mbps? Netflix is going to need a lot of snacks while it buffers.",
      "Your speed is {speed} Mbps. A carrier pigeon would be faster. Seriously.",
      "Decent speed. You can finally watch a YouTube video in 1080p without buffering for 20 minutes.",
      "Flexing much? You're definitely skipping the meeting and just downloading 4K memes.",
    ],
    ispRoast: [
      {
        match: ['comcast', 'xfinity'],
        lines: [
          'Xfinity: the only thing faster than their speed is how quickly they raise your bill.',
          'Comcast: because you don\'t have a choice, and we both know it.',
          'Xfinity — where "Gigabit" is a marketing term, not a reality.',
        ]
      },
      {
        match: ['at&t', 'att', 'u-verse'],
        lines: [
          'AT&T: Reach out and touch someone. Or just wait for this page to load.',
          'AT&T Fiber: The "Fiber" is mostly just a suggestion.',
        ]
      },
      {
        match: ['verizon', 'fios'],
        lines: [
          'Verizon Fios: Paying a premium for... well, this.',
          'Verizon: We have the best coverage! (Speed not included).',
        ]
      },
      {
        match: ['spectrum', 'charter'],
        lines: [
          'Spectrum: A broad spectrum of reasons to be disappointed.',
          'Charter Spectrum — where the only thing consistent is the inconsistency.',
        ]
      },
      {
        match: ['google', 'google fiber'],
        lines: [
          'Google Fiber: Even Google can\'t fix your house\'s terrible wiring.',
          'Google Fiber — proof that even the best tech can\'t save you from this router.',
        ]
      },
      {
        match: ['starlink', 'spacex'],
        lines: [
          'Starlink: High-speed satellite internet. High-latency satellite reality.',
          'Starlink — for when you want to be disappointed from space.',
        ]
      },
    ],
    ispRoastDefault: [
      '"{isp}"? Never heard of them. Based on this speed, I can see why.',
      'Your ISP ({isp}) is basically a professional disappointment service.',
      'I\'ve seen faster connections in literal deserts. Thanks, {isp}.',
      'Your provider ({isp}) should be paying YOU for dealing with this.',
      'Is your router just a potato with an antenna? Ask {isp}.',
    ],
    deviceRoast: {
      iphone: "That dynamic island doesn't hide your terrible speed.",
      android: "Great phone, shame about the connection.",
      desktop: "Big screen, small bandwidth. Tragic."
    },
    punchline: [
      'Have you tried turning it off and leaving it off?',
      'Maybe it\'s time to move. Or just get a better ISP.',
      'This isn\'t a speed test. It\'s an intervention.',
      'I\'d tell you a joke about UDP, but you might not get it.',
      'Your bandwidth called. It wants a divorce.',
      'I\'ve seen dial-up connections with more ambition.',
      'Is your neighbor stealing your WiFi? Because they\'re clearly not using it.',
      'You pay for this? On purpose?',
      'I hope you have a good data plan. You\'re going to need it.',
      'Upgrade your plan. Or your life. Ideally both.',
    ],
  },
};
