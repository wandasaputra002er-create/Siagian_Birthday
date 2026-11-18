/* ============================================================
   All the personal words of the site live here. Edit freely.
   - MEMORIES: six frames. Put photos in assets/memories/ and set src.
   - NOTES:    the "Open When…" envelopes (icon is optional).
   - SECRET:   the surprise after 20 taps on the cats ({age} = his age).
   - REMINDERS: the little reminders on the Surprise page.
   - WHISPERS: the lines that rotate under the title on the home page.
   ============================================================ */
window.CONTENT = {
  MEMORIES: [
      { src: 'assets/natan.jpeg', caption: 'Natan', date: '7 Agustus 2026', note: '"Natan, ayo foto dulu!"' },
    { src: 'assets/gacoan.jpeg', caption: '"Natan, gua mau udang keju dua buah sama es teh"', date: 'Add a date', note: 'Gak. Janji waktu itu cuman udang keju aja. Gak nambah (ujung-ujungnya gua kasih lagi tuh udang keju)' },
    { src: 'assets/natan2.jpeg', caption: '😼', date: '7 Agustus 2026', note: "Gak mau. Jangan paksa!" },
    { src: 'assets/permabaran.jpeg', caption: 'Infokan Permabaran', date: '7 Agustus 2026', note: 'Kita gak bakalan asing kalau mabar tiap hari, Kak' },
    { src: 'assets/natan4.jpeg', caption: 'Fakultasku Fakultas Hukum', date: '18 Oktober 2026', note: '"gw mau pake istilah hukum. selain itu, gak usah sekalian dibikin"' },
    { src: 'assets/adkesma1.jpeg', caption: 'Pewara dalam Acara Kabim Insight', date: ' 10 Oktober 2026 ', note: 'OK.' },
    { src: 'assets/detikdetikribut.jpeg', caption: '"Pujas aja"', date: '24 Oktober 2026', note: 'Detik-detik ribut' },
  ],
  NOTES: [
    { icon: '☾', when: 'Open when you can’t sleep', text: 'Tidak apa-apa kalau malam ini pikiranmu ramai. Tarik napas pelan, hitung sampai empat, lalu hembuskan. Besok bukan hari untuk menyelesaikan semuanya sekaligus.' },
    { icon: '☁', when: 'Open when you’re tired', text: 'Lelah bukan berarti lemah. Taruh dulu bebanmu sebentar. Minum air, duduk yang nyaman, dan biarkan dirimu jeda.' },
    { icon: '✦', when: 'Open when you doubt yourself', text: 'Ragu itu wajar, dan kamu tetap boleh melangkah pelan. Lihat saja sejauh apa kamu sudah berjalan.' },
    { icon: '☺', when: 'Open when you need a smile', text: 'Cari satu hal kecil yang menyenangkan di sekitarmu hari ini. Satu saja sudah cukup.' },
    { icon: '☀', when: 'Open when the day is good', text: 'Kalau hari ini baik, nikmati sepenuhnya. Kamu boleh merasa senang tanpa perlu alasan.' },
    { icon: '♡', when: 'Open when you feel alone', text: 'Dunia ini sedikit lebih hangat karena kamu ada di dalamnya. Itu benar, bahkan di hari-hari yang terasa sepi.' }
  ],
  SECRET: {
    taps: 20,
    title: 'Putusan Sela No. 20/TAP/ULTAH',
    lines: [
      'Menimbang: Saudara telah mengetuk layar ini sebanyak 20 kali.',
      'Mengingat: Rasa penasaranmu yang terbukti sah dan meyakinkan',
      'Memutuskan: Selamat ulang tahun yang ke-{age}, Natan.',
      'Putusan ini bersifat final, mengikat, dan tidak dapat diganggu gugat. Semua hal baik mesti dirayakan, dan kamu berhak mendapatkannya.',
    ]
  },
  REMINDERS: [
    'Jangan lupa makan. Tubuhmu juga perlu diperhatikan, bukan cuma pikiranmu yang terus bekerja.',
    'Tidak semua hal harus selesai hari ini. Besok masih menyediakan kesempatan untuk mencoba lagi.',
    'Kamu boleh lelah. Menjadi kuat bukan berarti harus selalu terlihat baik-baik saja.',
    'Jangan terlalu keras kepada dirimu sendiri. Kamu juga manusia yang sedang belajar menjalani hidup.',
    'Istirahat bukan bentuk kemalasan. Bahkan bunga pun membutuhkan waktu sebelum kembali mekar.',
    'Jangan membandingkan perjalananmu dengan orang lain. Kita semua punya musim tumbuh yang berbeda.',
    'Kalau hari ini terasa berat, jalani saja perlahan. Tidak perlu memenangkan seluruh dunia dalam sehari.',
    'Jangan lupa minum air putih. Hal-hal kecil juga merupakan bentuk kasih sayang kepada diri sendiri.',
    'Kalau sesuatu tidak berjalan sesuai rencana, bukan berarti seluruh masa depanmu ikut gagal.',
    'Berikan dirimu kesempatan untuk berubah pikiran. Kamu tidak harus menjadi orang yang sama seperti kemarin.',
    'Jangan lupa mengapresiasi dirimu sendiri. Ada banyak hal yang berhasil kamu lewati tanpa pernah kamu ceritakan kepada siapa pun.',
    'Semoga kamu tidak kehilangan hal-hal sederhana yang membuatmu bahagia hanya karena terlalu sibuk mengejar sesuatu yang besar.',
    'Kelak, semoga kamu bisa melihat kembali perjalananmu tanpa terlalu banyak menyalahkan diri sendiri.',
    'Dan yang paling penting, jangan lupa bahagia. Bukan hanya ketika semua keinginanmu tercapai, tetapi juga ketika hidup sedang berjalan biasa-biasa saja.'
  ], 

  WHISPERS: [
    'Pelan-pelan saja.',
    'Hari ini milikmu.',
    'Semoga hari ini ramah padamu.',
    'Take your time.',
    'Ada ruang kecil di sini untukmu.'
  ]
};
