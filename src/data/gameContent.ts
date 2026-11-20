import type {
  AchievementBadge,
  ComprehensionQuestion,
  HeroDefinition,
  LocationDefinition,
  MissionId,
  ScriptPlan,
  StoryFragment,
} from '../types/game';

export const OPENING_NARRATION_PARAGRAPHS: string[] = [
  'Di sebuah kerajaan yang dibina atas ribuan kisah, sejarah bukan sekadar catatan. Setiap helaian menyimpan kenangan, perjuangan dan warisan yang diperturunkan dari satu generasi ke generasi seterusnya.',
  'Namun, pada malam Festival Cahaya Diraja, sesuatu yang aneh telah berlaku.',
  'Jam menara istana terhenti. Lukisan sejarah kehilangan warnanya. Buku-buku di perpustakaan menjadi kosong. Penduduk kerajaan mula melupakan kisah yang pernah mereka kenali.',
  'Kini, empat wira telah dipilih untuk membongkar rahsia yang tersembunyi.',
  'Adakah mereka mampu menemui kebenaran sebelum seluruh sejarah kerajaan lenyap?',
  'Selamat datang ke Kingdom of Stories.',
];

export const FINAL_FESTIVAL_NARRATION: string[] = [
  'Dengan selesainya persembahan di Balairung Gemilang Diraja, helaian terakhir Hikayat Diraja kembali bercahaya.',
  'Jam menara istana berdetik semula. Lukisan sejarah memancarkan warna asalnya. Buku-buku di Pustaka Agung Hikayat Diraja kembali sarat dengan ilmu dan teladan.',
  'Malam Festival Cahaya Diraja kini bersinar dengan penuh kemegahan. Tahniah, wira muda! Kisah yang anda hidupkan telah memelihara ilmu, kenangan, nilai murni dan warisan kerajaan kita.',
];

export const HEROES: HeroDefinition[] = [
  {
    id: 'ayden',
    name: 'Ayden',
    title: 'Penjelajah Diraja',
    roleLabel: 'Penerokaan dan Penemuan',
    personality: ['Berani', 'Ingin tahu', 'Sukakan cabaran'],
    abilityName: 'Deria Penjelajah',
    abilityDescription:
      'Mengesan objek tersembunyi, laluan rahsia, dan serpihan kisah yang terpencil dengan pancaran kompas emas.',
    primaryColor: '#7FA88C',
    secondaryColor: '#D4AF37',
    accentColor: '#FAF6EE',
    voicePitch: 0.96,
  },
  {
    id: 'elena',
    name: 'Elena',
    title: 'Sarjana Diraja',
    roleLabel: 'Ilmu dan Tafsiran',
    personality: ['Bijaksana', 'Teliti', 'Berfikiran mendalam'],
    abilityName: 'Tafsiran Manuskrip',
    abilityDescription:
      'Meneliti petunjuk teks purba dan memberikan bimbingan kefahaman serta struktur penceritaan yang lebih terperinci.',
    primaryColor: '#C8B6E2',
    secondaryColor: '#233256',
    accentColor: '#D4AF37',
    voicePitch: 1.08,
  },
  {
    id: 'ryan',
    name: 'Ryan',
    title: 'Pereka Diraja',
    roleLabel: 'Mekanisme dan Penyelesaian Masalah',
    personality: ['Kreatif', 'Bijak berikhtiar', 'Inovatif'],
    abilityName: 'Mekanik Ajaib',
    abilityDescription:
      'Mengaktifkan mekanisme portal purba, menyusun garis masa dengan pantas, dan menyelesaikan teka-teki susunan.',
    primaryColor: '#8FBCE0',
    secondaryColor: '#B88E28',
    accentColor: '#EFE6D5',
    voicePitch: 1.0,
  },
  {
    id: 'eva',
    name: 'Eva',
    title: 'Pencerita Diraja',
    roleLabel: 'Komunikasi dan Penceritaan',
    personality: ['Ekspresif', 'Yakin', 'Kreatif berimaginasi'],
    abilityName: 'Suara Hikayat',
    abilityDescription:
      'Menjalinkan komunikasi yang mendalam dengan watak NPC serta memberikan tip penyampaian suara dan intonasi.',
    primaryColor: '#E6DDF5',
    secondaryColor: '#D4AF37',
    accentColor: '#7FA88C',
    voicePitch: 1.12,
  },
];

export const LOCATIONS: LocationDefinition[] = [
  {
    id: 'citadel',
    name: 'Kota Diraja · Balai Agung Diraja',
    subtitle: 'Pusat Utama Lima Portal Misi Hikayat Diraja',
    description:
      'Balai Agung Diraja bermandikan cahaya keemasan dengan tiang marmar berukir, tangga lengkung berkembar, candelier kristal, takhta agung dan kelima-lima gerbang portal misi hikayat yang tersusun megah untuk pengembaraan anda.',
    portalColor: '#D4AF37',
    spawnPosition: [0, 0, 12],
  },
  {
    id: 'library',
    name: 'Pustaka Agung Hikayat Diraja',
    subtitle: 'Misi 1 · Hikayat Yang Membisu · The Grand Enchanted Royal Library',
    missionId: 'silent_chronicle',
    missionTitle: 'Hikayat Yang Membisu',
    description:
      'Pustaka diraja yang megah dengan rak buku menjulang tinggi, candelier kristal berputar, buku terapung bercahaya dan manuskrip purba. Dengarkan kisah "Misi Menyelamatkan Taman Sekolah" dan kenal pasti unsur-unsur cerita.',
    portalColor: '#8FBCE0',
    spawnPosition: [0, 0, 12],
  },
  {
    id: 'woods',
    name: 'Rimba Cahaya Mahkota',
    subtitle: 'Misi 2 · Garis Masa Yang Terpecah · The Crown of Enchanted Light',
    missionId: 'shattered_timeline',
    missionTitle: 'Garis Masa Yang Terpecah',
    description:
      'Rimba diraja bermandikan cahaya keemasan dengan pepohon raksasa berukiran rune, air terjun berkilauan, kristal melayang dan jambatan batu purba. Jejak 5 serpihan kisah yang hilang dan susun semula kronologi cerita dengan tepat.',
    portalColor: '#7FA88C',
    spawnPosition: [0, 0, 14],
  },
  {
    id: 'atelier',
    name: 'Balai Cipta Mahkota & Balai Gema Diraja',
    subtitle: 'Misi 3 & 4 · Arkitek Kisah & Ujian Suara Diraja',
    missionId: 'story_architect',
    missionTitle: 'Arkitek Kisah & Ujian Suara Diraja',
    description:
      'Dua sayap diraja yang saling terhubung: Balai Cipta Mahkota (The Royal Enchanted Workshop) untuk membina skrip serta papan cerita, dan Balai Gema Diraja (The Royal Voice Recording Chamber) untuk rakaman suara penceritaan lisan.',
    portalColor: '#C8B6E2',
    spawnPosition: [0, 0, 10],
  },
  {
    id: 'theatre',
    name: 'Balairung Gemilang Diraja',
    subtitle: 'Misi 5 · Hikayat Terakhir · The Grand Radiant Royal Hall',
    missionId: 'final_chronicle',
    missionTitle: 'Hikayat Terakhir',
    description:
      'Balairung persembahan diraja bermandikan cahaya candelier kristal, tirai baldu merah delima dan takhta emas berukir. Persembahkan video penceritaan digital akhir "Misi Menyelamatkan Taman Sekolah" di hadapan warga kerajaan.',
    portalColor: '#D4AF37',
    spawnPosition: [0, 0, 12],
  },
];

export const MISSION_ORDER: Array<{
  id: MissionId;
  number: number;
  title: string;
  locationId: 'library' | 'woods' | 'atelier' | 'theatre';
  locationName: string;
  objective: string;
}> = [
  {
    id: 'silent_chronicle',
    number: 1,
    title: 'Hikayat Yang Membisu',
    locationId: 'library',
    locationName: 'Pustaka Agung Hikayat Diraja',
    objective: 'Dengarkan kisah "Misi Menyelamatkan Taman Sekolah" dan lengkapkan analisis unsur cerita.',
  },
  {
    id: 'shattered_timeline',
    number: 2,
    title: 'Garis Masa Yang Terpecah',
    locationId: 'woods',
    locationName: 'Rimba Cahaya Mahkota',
    objective: 'Temui 5 serpihan kisah di dalam rimba dan susun kronologi peristiwa dari permulaan hingga penutup.',
  },
  {
    id: 'story_architect',
    number: 3,
    title: 'Arkitek Kisah',
    locationId: 'atelier',
    locationName: 'Balai Cipta Mahkota',
    objective: 'Rancang tema, watak, latar, papan cerita dan tulis skrip penceritaan dengan bimbingan Mentor Bahasa AI.',
  },
  {
    id: 'royal_voice_trial',
    number: 4,
    title: 'Ujian Suara Diraja',
    locationId: 'atelier',
    locationName: 'Balai Gema Diraja',
    objective: 'Rakam suara penceritaan anda, semak maklum balas, dan rakam cubaan kedua yang lebih mantap.',
  },
  {
    id: 'final_chronicle',
    number: 5,
    title: 'Hikayat Terakhir',
    locationId: 'theatre',
    locationName: 'Balairung Gemilang Diraja',
    objective: 'Muat naik atau pilih video penceritaan digital akhir dan tayangkannya di atas pentas 3D.',
  },
];

export const TAMAN_SEKOLAH_STORY_AUDIO_SEGMENTS: Array<{
  id: string;
  heading: string;
  sfxCue: string;
  text: string;
}> = [
  {
    id: 'seg-1',
    heading: 'Babak 1 · Misteri Di Sebalik Taman',
    sfxCue: 'Kicauan burung, tiupan angin dan bunyi helaian buku bergerak.',
    text: 'Pada suatu pagi yang cerah, Aiman, Sofia dan Danish berjalan menuju ke taman sekolah selepas tamat waktu rehat. Mereka terkejut melihat bunga-bunga yang dahulunya mekar kini layu, sampah bertaburan di merata-rata tempat, dan air kolam menjadi keruh. Tiba-tiba, mereka terdengar bunyi dari sebalik bangku lama lalu menemui sebuah buku usang bersampul keemasan bertajuk "Rahsia Taman Warisan".',
  },
  {
    id: 'seg-2',
    heading: 'Babak 2 · Petunjuk Yang Tersembunyi',
    sfxCue: 'Buku dibuka bersama bunyi cahaya ajaib.',
    text: 'Sofia membaca pesanan di dalam buku itu: "Keindahan taman tidak akan kembali selagi tiga punca kerosakannya tidak diperbaiki." Mereka pun menyiasat dan menemui tiga punca utama: sampah dibuang merata-rata, pokok dan bunga tidak disiram sehingga layu, serta saliran air tersumbat yang mengotorkan kolam. Cikgu Hana datang menghampiri dan menasihati mereka agar merancang tindakan penyelesaian yang teratur.',
  },
  {
    id: 'seg-3',
    heading: 'Babak 3 · Misi Menyelamatkan Taman',
    sfxCue: 'Muzik pengembaraan yang semakin bersemangat.',
    text: 'Mereka memulakan misi gotong-royong bersama rakan-rakan. Aiman mengajak rakan mengutip dan mengasingkan sampah mengikut jenis. Sofia menyediakan jadual penjagaan agar setiap tumbuhan disiram secara berkala. Danish pula mencadangkan saliran tersumbat dibersihkan dengan bantuan guru dan pekerja sekolah. Berkat kerjasama, taman kembali bersih, pokok segar, dan air kolam kembali jernih.',
  },
  {
    id: 'seg-4',
    heading: 'Babak 4 · Keajaiban Sebuah Kerjasama',
    sfxCue: 'Kicauan burung semakin jelas, alunan muzik ceria dan air mengalir.',
    text: 'Beberapa minggu kemudian, taman sekolah kembali berseri. Buku "Rahsia Taman Warisan" memancarkan cahaya keemasan dengan pesanan terakhir: "Keindahan bukan hadir dengan sendirinya. Keindahan terpelihara melalui tanggungjawab dan kerjasama." Cikgu Hana memuji usaha mereka. Aiman, Sofia dan Danish menyedari bahawa perubahan besar bermula daripada tindakan kecil yang dilakukan bersama-sama.',
  },
];

export const LIBRARY_QUESTIONS: ComprehensionQuestion[] = [
  {
    id: 'q1',
    category: 'Watak',
    prompt: 'Siapakah watak murid yang menyiasat dan memulihkan taman sekolah bersama Cikgu Hana dalam kisah ini?',
    options: [
      'Aiman (berani), Sofia (bijak & teliti), dan Danish (kreatif)',
      'Pengawal istana dan tukang kebun bandar',
      'Seorang pengawas yang bekerja bersendirian',
      'Sekumpulan pelawat dari sekolah lain',
    ],
    correctIndex: 0,
    explanation:
      'Aiman yang berani, Sofia yang bijak dan teliti, serta Danish yang kreatif berganding bahu bersama Cikgu Hana, guru yang prihatin.',
    adaptiveHint:
      'Petunjuk: Perhatikan tiga orang sahabat dalam Babak 1 yang menuju ke taman sekolah selepas waktu rehat.',
  },
  {
    id: 'q2',
    category: 'Latar',
    prompt: 'Bilakah dan di manakah kisah "Misi Menyelamatkan Taman Sekolah" bermula?',
    options: [
      'Pada waktu malam di perpustakaan bandar',
      'Pada suatu pagi yang cerah selepas waktu rehat di taman sekolah',
      'Di puncak bukit pada hujung minggu',
      'Di kantin sekolah sebelum loceng pagi berbunyi',
    ],
    correctIndex: 1,
    explanation:
      'Kisah bermula pada suatu pagi yang cerah selepas tamat waktu rehat di taman sekolah yang terkenal dengan bunga-bungaan dan kolam kecilnya.',
    adaptiveHint: 'Petunjuk: Semak ayat pembukaan Babak 1 tentang waktu dan tempat Aiman, Sofia dan Danish berjalan.',
  },
  {
    id: 'q3',
    category: 'Masalah Utama',
    prompt: 'Apakah tiga punca kerosakan taman sekolah yang disebut oleh buku "Rahsia Taman Warisan"?',
    options: [
      'Taman terlalu sempit, tiada kerusi dan kekurangan lampu',
      'Sampah dibuang merata-rata, pokok tidak disiram sehingga layu, dan saliran air tersumbat',
      'Taman ditutup oleh guru besar sepanjang tahun',
      'Semua bangku lama telah rosak akibat ribut petir',
    ],
    correctIndex: 1,
    explanation:
      'Dalam Babak 2, mereka mendapati tiga punca kerosakan ialah sampah merata-rata, tumbuhan tidak disiram, dan saliran air kolam tersumbat.',
    adaptiveHint: 'Petunjuk: Ingat semula tiga perkara yang dilaporkan oleh Sofia kepada Cikgu Hana dalam Babak 2.',
  },
  {
    id: 'q4',
    category: 'Peristiwa Penting',
    prompt: 'Apakah objek misteri yang ditemui di bawah bangku lama dan apakah pesanan awalnya?',
    options: [
      'Sekeping peta emas tanpa tulisan',
      'Buku usang bersampul keemasan bertajuk "Rahsia Taman Warisan" tentang membaiki tiga punca kerosakan',
      'Sebuah jam pasir yang rosak',
      'Kunci bilik stor sukan sekolah',
    ],
    correctIndex: 1,
    explanation:
      'Mereka menemui buku "Rahsia Taman Warisan" yang memberi petunjuk bahawa keindahan taman hanya kembali jika tiga punca kerosakannya diperbaiki.',
    adaptiveHint: 'Petunjuk: Dengar semula bahagian akhir Babak 1 dan awal Babak 2.',
  },
  {
    id: 'q5',
    category: 'Penyelesaian',
    prompt: 'Bagaimanakah Aiman, Sofia dan Danish membahagikan tugasan dalam misi menyelamatkan taman?',
    options: [
      'Aiman mengutip & mengasingkan sampah, Sofia membuat jadual menyiram pokok, Danish mencadangkan pembersihan saliran bersama guru dan pekerja sekolah',
      'Mereka menunggu pekerja kontrak luar tanpa mengajak rakan lain',
      'Mereka memindahkan semua bunga ke dalam kelas',
      'Mereka hanya mengecat bangku lama tanpa membersihkan kolam',
    ],
    correctIndex: 0,
    explanation:
      'Setiap watak menyumbang mengikut kekuatan masing-masing sambil mengajak rakan-rakan lain bergotong-royong.',
    adaptiveHint: 'Petunjuk: Semak peranan khusus Aiman, Sofia dan Danish dalam Babak 3.',
  },
  {
    id: 'q6',
    category: 'Nilai Murni',
    prompt: 'Apakah pesanan terakhir pada halaman buku "Rahsia Taman Warisan" dalam Babak 4?',
    options: [
      'Keindahan boleh dibeli dengan wang ringgit',
      'Keindahan bukan hadir dengan sendirinya; keindahan terpelihara melalui tanggungjawab dan kerjasama',
      'Kebersihan hanya tugas tukang kebun sekolah',
      'Pertandingan taman tercantik perlu diadakan setiap hari',
    ],
    correctIndex: 1,
    explanation:
      'Nilai teras kisah ini ialah perubahan besar bermula daripada tindakan kecil yang dilakukan bersama-sama melalui kebersihan, tanggungjawab dan kerjasama.',
    adaptiveHint: 'Petunjuk: Lihat ayat bercahaya keemasan pada halaman terakhir buku dalam Babak 4.',
  },
];

export const STORY_FRAGMENTS: StoryFragment[] = [
  {
    id: 'frag-1',
    orderIndex: 1,
    stage: 'Permulaan',
    title: 'Serpihan I · Misteri Di Sebalik Taman',
    text: 'Aiman, Sofia dan Danish mendapati bunga taman sekolah layu, sampah bertaburan dan air kolam keruh, lalu menemui buku "Rahsia Taman Warisan" di bawah bangku lama.',
    hint: 'Ini ialah kejadian awal dalam Babak 1 selepas waktu rehat.',
    worldPosition: [-12, 1.4, 4],
  },
  {
    id: 'frag-2',
    orderIndex: 2,
    stage: 'Permulaan',
    title: 'Serpihan II · Tiga Petunjuk Tersembunyi',
    text: 'Buku itu mendedahkan taman tidak akan pulih selagi tiga punca tidak dibaiki: sampah merata-rata, pokok tidak disiram, dan saliran air tersumbat. Cikgu Hana membimbing mereka merancang tindakan.',
    hint: 'Siasatan punca masalah dan nasihat Cikgu Hana berlaku dalam Babak 2.',
    worldPosition: [11, 1.4, 5],
  },
  {
    id: 'frag-3',
    orderIndex: 3,
    stage: 'Pertengahan',
    title: 'Serpihan III · Pembahagian Tugas Misi',
    text: 'Aiman mengajak rakan mengutip dan mengasingkan sampah, Sofia menyusun jadual siraman berkala, dan Danish mencadangkan pembersihan saliran bersama guru serta pekerja sekolah.',
    hint: 'Tindakan gotong-royong terancang ini merupakan teras Babak 3.',
    worldPosition: [-14, 1.4, -10],
  },
  {
    id: 'frag-4',
    orderIndex: 4,
    stage: 'Pertengahan',
    title: 'Serpihan IV · Taman Kembali Berseri',
    text: 'Selepas beberapa minggu berusaha secara konsisten dan sepakat, kawasan taman menjadi bersih, pokok kembali segar, bunga berkembang dan air kolam kembali jernih.',
    hint: 'Hasil usaha gotong-royong yang memulihkan taman sebelum kemuncak pesanan akhir.',
    worldPosition: [13, 1.4, -11],
  },
  {
    id: 'frag-5',
    orderIndex: 5,
    stage: 'Pengakhiran',
    title: 'Serpihan V · Keajaiban Sebuah Kerjasama',
    text: 'Buku "Rahsia Taman Warisan" memancarkan cahaya keemasan dengan pesanan bahawa keindahan terpelihara melalui tanggungjawab dan kerjasama seluruh warga sekolah.',
    hint: 'Penutup dan pengajaran utama dalam Babak 4.',
    worldPosition: [0, 1.4, -18],
  },
];

export const DEFAULT_SCRIPT_PLAN: ScriptPlan = {
  theme: 'Pengembaraan, misteri, persahabatan, kebersihan, tanggungjawab dan kerjasama menjaga alam sekitar',
  characters: 'Pencerita, Aiman (berani) dan Sofia (bijak & teliti)',
  supportingCharacters: 'Danish (kreatif), Cikgu Hana (guru prihatin) dan pekerja sekolah',
  setting: 'Taman sekolah pada waktu pagi yang cerah selepas waktu rehat serta di sekitar bangku lama dan kolam',
  beginning:
    'Aiman, Sofia dan Danish terkejut melihat taman sekolah layu, bersampah dan berkolam keruh, lalu menemui buku misteri "Rahsia Taman Warisan" di bawah bangku lama.',
  development:
    'Mereka membaca petunjuk di dalam buku misteri dan bersama Cikgu Hana menyenaraikan punca kerosakan taman serta merancang misi gotong-royong.',
  middle:
    'Mereka membaca petunjuk di dalam buku misteri dan bersama Cikgu Hana menyenaraikan punca kerosakan taman serta merancang misi gotong-royong.',
  conflict:
    'Saliran air kolam tersumbat teruk, tanaman kekurangan air, dan mereka perlu menyiapkan pemulihan taman sebelum minggu penilaian sekolah.',
  ending:
    'Taman sekolah kembali indah melalui kerjasama semua pihak dan buku itu memancarkan cahaya keemasan dengan pesanan tentang tanggungjawab bersama.',
  fullScript:
    'Pada suatu pagi yang cerah selepas waktu rehat, Aiman, Sofia dan Danish terkejut melihat taman sekolah mereka menjadi suram. Bunga-bunga layu, sampah bertaburan dan air kolam kelihatan keruh. Di bawah sebuah bangku lama, mereka menemui buku usang bersampul keemasan bertajuk "Rahsia Taman Warisan" yang memberi petunjuk tentang tiga punca kerosakan taman. Dengan bimbingan Cikgu Hana, mereka merancang misi gotong-royong bersama rakan-rakan. Aiman mengetuai pengasingan sampah, Sofia menyediakan jadual siraman tumbuhan, manakala Danish mengurus pembersihan saliran air yang tersumbat bersama guru dan pekerja sekolah. Beberapa minggu kemudian, taman kembali berseri dan buku itu bercahaya dengan pesanan: keindahan terpelihara melalui tanggungjawab dan kerjasama.',
  storyboard: [
    {
      id: 'sb-1',
      stage: 'Permulaan',
      title: 'Babak 1 · Misteri Di Sebalik Taman',
      eventDescription:
        'Aiman, Sofia dan Danish tiba di taman sekolah yang suram lalu menemui buku misteri "Rahsia Taman Warisan" di bawah bangku lama.',
      characterDialogue: '"Mengapa taman sekolah kita menjadi layu dan bersepah begini?" tanya Aiman dengan hairan.',
      visualDescription:
        'Paparan luas taman sekolah yang layu dan bersampah pada waktu pagi; watak menemui buku bercahaya di bawah bangku lama.',
      narrationCue: 'Mulakan dengan suasana pagi yang tenang, diikuti nada hairan apabila melihat keadaan taman.',
      mood: 'Misteri dan ingin tahu',
    },
    {
      id: 'sb-2',
      stage: 'Perkembangan',
      title: 'Babak 2 · Petunjuk Yang Tersembunyi',
      eventDescription:
        'Sofia membaca tulisan bercahaya di dalam buku sementara Cikgu Hana membimbing mereka menyusun pelan tindakan.',
      characterDialogue: '"Lihat! Buku ini menunjukkan tiga punca utama kerosakan taman kita," kata Sofia bersungguh-sungguh.',
      visualDescription:
        'Syot dekat buku terbuka yang memancarkan cahaya keemasan sambil Sofia, Aiman, Danish dan Cikgu Hana berbincang.',
      narrationCue: 'Tekankan dialog penemuan tiga masalah dengan jelas dan teratur.',
      mood: 'Penuh kesungguhan',
    },
    {
      id: 'sb-3',
      stage: 'Konflik',
      title: 'Babak 3 · Cabaran Membersihkan Saliran & Taman',
      eventDescription:
        'Mereka berdepan saliran air tersumbat dan sampah bertaburan sebelum berganding bahu mengasingkan sampah dan membina jadual siraman.',
      characterDialogue: '"Saliran ini agak tersumbat, tetapi jika kita bekerjasama pasti boleh diselesaikan!" seru Danish.',
      visualDescription:
        'Aksi gotong-royong berpasukan: mengasingkan sampah, menyiram tumbuhan dan membersihkan saliran kolam.',
      narrationCue: 'Gunakan nada bersemangat dan ceria mengiringi rentak kerja berpasukan.',
      mood: 'Bersemangat dan sepakat',
    },
    {
      id: 'sb-4',
      stage: 'Pengakhiran',
      title: 'Babak 4 · Keajaiban Sebuah Kerjasama',
      eventDescription:
        'Taman kembali mekar dengan kolam yang jernih dan buku keemasan memancarkan pesanan tentang nilai tanggungjawab.',
      characterDialogue: '"Syabas semua! Kerjasama dan tanggungjawab kita telah mengembalikan keindahan taman ini," ujar Cikgu Hana.',
      visualDescription:
        'Taman sekolah berseri dengan bunga mekar dan air kolam jernih di bawah sinaran matahari keemasan.',
      narrationCue: 'Akhiri dengan intonasi hangat, bangga dan jelas pada mesej penutup.',
      mood: 'Ceria, bangga dan menginspirasikan',
    },
  ],
};

export const INITIAL_ACHIEVEMENTS: AchievementBadge[] = [
  {
    id: 'ach_first_step',
    title: 'Langkah Pertama Di Kota',
    description: 'Berjaya memilih wira dan memulakan pengembaraan di Kota Diraja.',
    category: 'Penerokaan',
  },
  {
    id: 'ach_silent_chronicle',
    title: 'Penyingkap Hikayat Membisu',
    description: 'Menyelesaikan misi kefahaman "Misi Menyelamatkan Taman Sekolah" di Pustaka Agung Hikayat Diraja.',
    category: 'Pencapaian',
  },
  {
    id: 'ach_explorer_woods',
    title: 'Pencari Serpihan Rimba',
    description: 'Menemui semua 5 serpihan kisah yang tersembunyi di Rimba Cahaya Mahkota.',
    category: 'Penerokaan',
  },
  {
    id: 'ach_timeline_master',
    title: 'Penjaga Garis Masa',
    description: 'Menyusun kronologi peristiwa cerita dari permulaan hingga penutup.',
    category: 'Pencapaian',
  },
  {
    id: 'ach_story_architect',
    title: 'Arkitek Kisah Diraja',
    description: 'Menghasilkan rancangan penceritaan, papan cerita dan menyemak skrip bersama Mentor Bahasa AI.',
    category: 'Kreativiti',
  },
  {
    id: 'ach_voice_effort',
    title: 'Suara Yang Berani',
    description: 'Merakam cubaan pertama penceritaan lisan di Balai Gema Diraja.',
    category: 'Usaha',
  },
  {
    id: 'ach_voice_improved',
    title: 'Bintang Peningkatan Lisan',
    description: 'Merakam cubaan kedua dan menunjukkan kesungguhan memperbaiki penyampaian suara.',
    category: 'Peningkatan',
  },
  {
    id: 'ach_collaborator',
    title: 'Sahabat Sepakat',
    description: 'Menyertai Bilik Kolaborasi untuk berkongsi petunjuk dan membina kisah bersama rakan.',
    category: 'Kolaborasi',
  },
  {
    id: 'ach_final_festival',
    title: 'Pewaris Cahaya Diraja',
    description: 'Mempersembahkan video penceritaan akhir di Balairung Gemilang Diraja dan memulihkan kerajaan.',
    category: 'Pencapaian',
  },
];

export const NPC_DIALOGUES = {
  guardian: {
    name: 'Penjaga Diraja Ariff',
    role: 'Penjaga Kota Diraja',
    lines: [
      'Selamat datang ke Kota Diraja, wahai wira muda! Seperti yang anda lihat, jam menara istana telah terhenti dan lukisan sejarah kita kehilangan warnanya.',
      'Untuk mengembalikan cahaya kerajaan, kita perlu memulihkan lima misi hikayat bermula dari Pustaka Agung Hikayat Diraja di portal biru sebelah kiri.',
      'Setiap misi akan membawa anda lebih dekat untuk membangunkan semula kisah "Misi Menyelamatkan Taman Sekolah" di Balairung Gemilang Diraja.',
    ],
  },
  librarian: {
    name: 'Pustakawan Seri',
    role: 'Penjaga Pustaka Agung Hikayat Diraja',
    lines: [
      'Syukur anda tiba! Buku-buku di sini menjadi kosong, namun Stesen Pendengaran Ajaib masih menyimpan gema suara kisah "Misi Menyelamatkan Taman Sekolah".',
      'Dengarkan rakaman hikayat itu terlebih dahulu, kemudian uji kefahaman anda pada Meja Manuskrip Purba.',
    ],
  },
  forestKeeper: {
    name: 'Penunggu Rimba Laila',
    role: 'Penjaga Rimba Cahaya Mahkota',
    lines: [
      'Helaian cerita telah ditiup angin malam ke seluruh pelusuk Rimba Cahaya Mahkota. Ada lima serpihan bercahaya yang perlu anda kumpulkan.',
      'Setelah semua serpihan ditemui, pergilah ke Altar Kronologi Batu Purba di utara rimba untuk menyusunnya mengikut urutan masa.',
    ],
  },
  atelierMaster: {
    name: 'Tukang Kata Arif',
    role: 'Pembimbing Balai Cipta Mahkota & Balai Gema Diraja',
    lines: [
      'Di sayap barat terletak Balai Cipta Mahkota! Gunakan Meja Emas Diraja di situ untuk menyusun skrip dan papan cerita anda.',
      'Kemudian melangkahlah ke sayap timur, Balai Gema Diraja yang megah dengan studio kalis bunyi untuk berlatih dan merakam suara penceritaan anda.',
    ],
  },
  theatreDirector: {
    name: 'Pengarah Pentas Puan Salma',
    role: 'Kurator Balairung Gemilang Diraja',
    lines: [
      'Pentas Balairung Gemilang Diraja sudah sedia menerima persembahan agung anda!',
      'Naik ke podium pentas dan muat naik atau pilih video penceritaan digital "Misi Menyelamatkan Taman Sekolah" untuk memulakan Festival Cahaya Diraja.',
    ],
  },
};
