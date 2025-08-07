<template>
    <div id="app">
      <h1>Data Geospasial PBB P2 Kabupaten Kulonprogo</h1>
  
      <div class="controls">
        <label for="kabupaten-select">Kabupaten:</label>
        <select id="kabupaten-select" v-model="selectedKabupaten" @change="filterData">
          <option value="">Semua Kabupaten</option>
          <option v-for="kab in uniqueKabupaten" :key="kab" :value="kab">{{ kab }}</option>
        </select>
  
        <label for="kecamatan-select" v-if="selectedKabupaten">Kapanewon:</label>
        <select id="kecamatan-select" v-model="selectedKecamatan" @change="filterData" v-if="selectedKabupaten">
          <option value="">Semua Kapanewon</option>
          <option v-for="kec in filteredKecamatan" :key="kec" :value="kec">{{ kec }}</option>
        </select>
  
        <label for="kalurahan-select" v-if="selectedKecamatan">Kalurahan:</label>
        <select id="kalurahan-select" v-model="selectedKalurahan" @change="filterData" v-if="selectedKecamatan">
          <option value="">Semua Kalurahan</option>
          <option v-for="kal in filteredKalurahan" :key="kal" :value="kal">{{ kal }}</option>
        </select>
  
        <label for="tahun-select">Tahun Realisasi:</label>
        <select id="tahun-select" v-model="selectedTahun" @change="fetchData">
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
        </select>
  
        <label for="tglawal">Tanggal Awal:</label>
        <input type="date" id="tglawal" v-model="tanggalAwal" @change="fetchData">
  
        <label for="tglakhir">Tanggal Akhir:</label>
        <input type="date" id="tglakhir" v-model="tanggalAkhir" @change="fetchData">
      </div>
  
      <div id="map-container">
        <LMap :zoom="mapZoom" :center="mapCenter" style="height: 650px; width: 100%;">
          <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors"></LTileLayer>
          <LGeoJson :geojson="filteredGeojson" :options="geoJsonOptions" ref="geojsonLayer"></LGeoJson>
        </LMap>
      </div>
  
      <div v-if="selectedFeature" class="info-panel">
        <h3>Detail Wilayah: {{ selectedFeature.properties.DESA || 'N/A' }}</h3>
        <p><strong>Kapanewon:</strong> {{ selectedFeature.properties.KECAMATAN || 'N/A' }}</p>
        <p><strong>Kabupaten:</strong> {{ selectedFeature.properties.KAB_KOTA || 'N/A' }}</p>
        <hr>
        <h4>Data Demografi:</h4>
        <!--
        <p><strong>Jumlah Penduduk:</strong> {{ selectedFeature.properties.JUMLAH_PEN || 'N/A' }}</p>
        <p><strong>Jumlah KK:</strong> {{ selectedFeature.properties.JUMLAH_KK || 'N/A' }}</p>
        <p><strong>Pria:</strong> {{ selectedFeature.properties.PRIA || 'N/A' }}</p>
        <p><strong>Wanita:</strong> {{ selectedFeature.properties.WANITA || 'N/A' }}</p>
        <hr>-->

        <p><strong>Luas Wilayah (M2):</strong> {{ selectedFeature.properties.JUMLAH_PEN || 'N/A' }}</p>
        <hr>
        
        <h4>Data Ketetapan PBB:</h4>
        <p><strong>Tahun Pajak :</strong> {{ selectedFeature.properties.THN_PAJAK_SPPT || 'N/A' }}</p>
        <p><strong>Kalurahan :</strong> {{ selectedFeature.properties.NM_KELURAHAN || 'N/A' }}</p>
        <p><strong>Jumlah Ketetapan PBB (Lembar):</strong> {{ selectedFeature.properties.JUMLAH_KETETAPAN_SPPT || 0 }}</p>
        <p><strong>Total Ketetapan PBB (Rp):</strong> {{ (selectedFeature.properties.KETETAPAN_RP) || 'Rp 0' }}</p>
        <hr>
        <h4>Data Realisasi PBB:</h4>
        <p><strong>Tahun Pajak :</strong> {{ selectedFeature.properties.THN_PAJAK_SPPT || 'N/A' }}</p>
        <p><strong>Kalurahan:</strong> {{ selectedFeature.properties.NM_KELURAHAN || 'N/A' }}</p>
        <p><strong>Jumlah Realisasi Penerimaan PBB (Lembar):</strong> {{ selectedFeature.properties.JUMLAH_REALISASI_SPPT || 0 }}</p>
        <!--<p><strong>Total Realisasi (Rp):</strong> {{ formatRupiah(selectedFeature.properties.REALISASI_RP) || 'Rp 0' }}</p>-->
        <p><strong>Total Realisasi Penerimaan PBB (Rp):</strong> {{ (selectedFeature.properties.REALISASI_RP) || 'Rp 0' }}</p>
        <p><strong>Persentase Realisasi Penerimaan PBB (%):</strong> {{ (selectedFeature.properties.PERSENTASE) || 'Rp 0' }}</p>

        
        <!-- Tambahkan detail lain dari API jika ada -->
      </div>
    </div>
  </template>

<script setup>
//import { bpajakService } from '@/apiauthpbbgis.js'
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import { LMap, LTileLayer, LGeoJson } from '@vue-leaflet/vue-leaflet';
import 'leaflet/dist/leaflet.css'; // Import CSS Leaflet
import L from 'leaflet'; // Import objek L dari Leaflet untuk fungsi utilitas

// --- State Reaktif ---
const mapZoom = ref(10);
const mapCenter = ref([-7.8687, 110.3758]); // Koordinat tengah DIY (Yogyakarta)
const allGeojson = ref(null); // Menyimpan semua data GeoJSON yang dimuat
const realisasiSppt = ref([]); // Menyimpan data realisasi dari API
const filteredGeojson = ref({ type: 'FeatureCollection', features: [] }); // Data GeoJSON yang akan ditampilkan di peta
const selectedKabupaten = ref('');
const selectedKecamatan = ref('');
const selectedKalurahan = ref('');
const selectedFeature = ref(null); // Untuk menampilkan detail fitur yang diklik
const geojsonLayer = ref(null); // Ref untuk mengakses instance LGeoJson

// State untuk filter API
const selectedTahun = ref(new Date().getFullYear().toString()); // Tahun default saat ini
const tanggalAwal = ref(`${new Date().getFullYear()}-01-01`); // Default 1 Januari tahun ini
const tanggalAkhir = ref(`${new Date().getFullYear()}-12-31`); // Default 31 Desember tahun ini


const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
};

// --- Computed Properties untuk Filter Dropdown ---
const uniqueKabupaten = computed(() => {
  if (!allGeojson.value) return [];
  const kabSet = new Set();
  allGeojson.value.features.forEach(feature => {
    if (feature.properties && feature.properties.KAB_KOTA) {
      kabSet.add(feature.properties.KAB_KOTA);
    }
  });
  return [...kabSet].sort();
});

const filteredKecamatan = computed(() => {
  if (!allGeojson.value || !selectedKabupaten.value) return [];
  const kecSet = new Set();
  allGeojson.value.features.forEach(feature => {
    if (feature.properties && feature.properties.KAB_KOTA === selectedKabupaten.value && feature.properties.KECAMATAN) {
      kecSet.add(feature.properties.KECAMATAN);
    }
  });
  return [...kecSet].sort();
});

const filteredKalurahan = computed(() => {
  if (!allGeojson.value || !selectedKecamatan.value) return [];
  const kalSet = new Set();
  allGeojson.value.features.forEach(feature => {
    if (feature.properties && feature.properties.KECAMATAN === selectedKecamatan.value && feature.properties.DESA) {
      kalSet.add(feature.properties.DESA);
    }
  });
  return [...kalSet].sort();
});

const availableYears = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) { // 5 tahun ke belakang dan 5 tahun ke depan
    years.push(i.toString());
  }
  return years.sort((a, b) => b - a); // Urutkan dari tahun terbaru
});

// Dapatkan API Key dari variabel lingkungan
//const apiKey = import.meta.env.VITE_API_KEY;
// --- Fungsi Pengambilan Data ---
const fetchData = async () => {
  try {
    // 1. Ambil data spasial (GeoJSON) jika belum ada
    if (!allGeojson.value || allGeojson.value.features.length === 0) {
      const geojsonResponse = await axios.get('/data/batas_desa_kp_pbb.geojson');
      allGeojson.value = geojsonResponse.data;
    }

    // 2. Ambil data realisasi SPPT dari API
    // Ubah format tanggal sebelum mengirim permintaan API
    const formattedTglAwal = formatDateToDDMMYYYY(tanggalAwal.value);
        const formattedTglAkhir = formatDateToDDMMYYYY(tanggalAkhir.value);

    const realisasiResponse = await axios.get('/api/realisasikal', {
      params: {
        tahun: selectedTahun.value,
       // tglawal: tanggalAwal.value,
       // tglakhir: tanggalAkhir.value
       tglawal: formattedTglAwal, // Gunakan format baru di sini
       tglakhir: formattedTglAkhir, // Gunakan format baru di sini
      },
      // Tambahkan object 'headers' untuk mengirim API Key
      headers: {
        'x-api-key': apiKey // Nama header ini harus cocok dengan yang diminta oleh backend Anda
      }
    });
    console.log('Struktur data dari API:', realisasiResponse.data); // <--- TAMBAHKAN INI
    
    realisasiSppt.value = realisasiResponse.data;
    // 3. Gabungkan data setelah kedua data berhasil dimuat
    mergeData();

    // 4. Terapkan filter geografis
    filterData();

  } catch (error) {
    console.error('Error loading data:', error);
    alert('Gagal memuat data. Pastikan file GeoJSON dan API realisasi tersedia dan valid.');
  }
};

// --- Fungsi Penggabungan Data (Merge) ---
const mergeData = () => {
  if (!allGeojson.value || !realisasiSppt.value) return;

  // Buat objek pencarian cepat untuk data realisasi
  const realisasiMap = new Map();
  realisasiSppt.value.forEach(item => {
    // Gunakan kombinasi KODE_KEC dan KODE_KEL sebagai key unik
    // Sesuaikan dengan nama properti di data API Anda
    const key = `${item.KODE_KEC}.${item.KODE_KEL}`; 
    realisasiMap.set(key, item);
  });

  // Gabungkan data realisasi ke dalam setiap fitur GeoJSON
  allGeojson.value.features.forEach(feature => {
    // Pastikan nama properti di GeoJSON Anda (misal KD_KECAMATAN, KODE_DESA)
    // cocok dengan data API. Sesuaikan jika perlu.
    const kecGeoJson = feature.properties.KD_KECAMATAN; // Asumsi ini ada di GeoJSON
    const desaGeoJson = feature.properties.KODE_DESA;   // Asumsi ini ada di GeoJSON
    const key = `${kecGeoJson}.${desaGeoJson}`;

    if (realisasiMap.has(key)) {
      const data = realisasiMap.get(key);
      // Tambahkan properti baru ke GeoJSON
      feature.properties.NM_KELURAHAN = data.NM_KELURAHAN;
      feature.properties.THN_PAJAK_SPPT = data.THN_PAJAK_SPPT;

      feature.properties.JUMLAH_KETETAPAN_SPPT = data.JUMLAH_KETETAPAN_SPPT;
      feature.properties.KETETAPAN_RP = data.KETETAPAN_RP;
      feature.properties.PERSENTASE = data.PERSENTASE;

      feature.properties.JUMLAH_REALISASI_SPPT = data.JUMLAH_REALISASI_SPPT;
      feature.properties.REALISASI_RP = data.REALISASI_RP;
    } else {
      // Beri nilai default jika data tidak ditemukan
      feature.properties.NM_KELURAHAN = feature.properties.DESA; // Fallback ke nama desa dari GeoJSON
      feature.properties.JUMLAH_REALISASI_SPPT = 0;
      feature.properties.REALISASI_RP = 0;
    }
  });
};

// --- Fungsi Filter Data Geografis (Kabupaten, Kecamatan, Kalurahan) ---
const filterData = () => {
  if (!allGeojson.value) {
    filteredGeojson.value = { type: 'FeatureCollection', features: [] };
    return;
  }

  let featuresToDisplay = allGeojson.value.features;

  // Filter berdasarkan Kabupaten
  if (selectedKabupaten.value) {
    featuresToDisplay = featuresToDisplay.filter(feature =>
      feature.properties && feature.properties.KAB_KOTA === selectedKabupaten.value
    );
    // Reset kecamatan dan kalurahan jika tidak ada di kabupaten yang dipilih
    if (selectedKecamatan.value && !featuresToDisplay.some(f => f.properties.KECAMATAN === selectedKecamatan.value)) {
        selectedKecamatan.value = '';
        selectedKalurahan.value = '';
    }
  } else {
    // Jika Kabupaten direset, reset juga Kecamatan dan Kalurahan
    selectedKecamatan.value = '';
    selectedKalurahan.value = '';
  }

  // Filter berdasarkan Kecamatan
  if (selectedKecamatan.value) {
    featuresToDisplay = featuresToDisplay.filter(feature =>
      feature.properties && feature.properties.KECAMATAN === selectedKecamatan.value
    );
    // Reset kalurahan jika tidak ada di kecamatan yang dipilih
    if (selectedKalurahan.value && !featuresToDisplay.some(f => f.properties.DESA === selectedKalurahan.value)) {
        selectedKalurahan.value = '';
    }
  } else {
    // Jika Kecamatan direset, reset juga Kalurahan
    selectedKalurahan.value = '';
  }

  // Filter berdasarkan Kalurahan
  if (selectedKalurahan.value) {
    featuresToDisplay = featuresToDisplay.filter(feature =>
      feature.properties && feature.properties.DESA === selectedKalurahan.value
    );
  }

  filteredGeojson.value = {
    type: 'FeatureCollection',
    features: featuresToDisplay
  };
};


// --- Opsi LGeoJson (Styling dan Interaksi) ---
/*
const geoJsonOptions = {
  onEachFeature: (feature, layer) => {
    // Add click listener to set selectedFeature
    layer.on('click', (e) => {
      selectedFeature.value = feature;
      L.DomEvent.stopPropagation(e); // Mencegah klik menyebar ke peta di bawahnya
    });

    // Ubah warna saat hover
    layer.on('mouseover', (e) => {
      e.target.setStyle({
        weight: 3,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
      });
    });
    layer.on('mouseout', (e) => {
      // Kembalikan ke style default
      // Penting: Panggil fungsi style dengan feature yang sama
      e.target.setStyle(geoJsonOptions.style(feature));
    });
  },
  style: (feature) => {
    // Implementasi pewarnaan choropleth berdasarkan REALISASI_RP
    const realisasi = feature.properties.REALISASI_RP;
    let fillColor = '#d9d9d9'; // Abu-abu muda untuk data tidak tersedia

    if (realisasi) {
      // Skala warna yang bisa Anda sesuaikan
      if (realisasi > 500000000) fillColor = '#084081'; // Biru Tua
      else if (realisasi > 200000000) fillColor = '#0868ac'; // Biru
      else if (realisasi > 50000000) fillColor = '#4393c3'; // Biru Muda
      else if (realisasi > 10000000) fillColor = '#7bccc4'; // Teal
      else if (realisasi > 1000000) fillColor = '#BAE4BC'; // Hijau Muda
      else fillColor = '#f7fcf0'; // Hijau Sangat Muda
    }

    return {
      fillColor: fillColor,
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  }
};
*/

// --- Opsi LGeoJson (Styling dan Interaksi) ---
const geoJsonOptions = {
  onEachFeature: (feature, layer) => {
    // 1. Tambahkan popup atau tooltip
    // Gunakan tooltip untuk tampilan yang lebih dinamis saat hover
    if (feature.properties && feature.properties.NM_KELURAHAN) {
      layer.bindTooltip(feature.properties.NM_KELURAHAN, {
        permanent: false, // Tooltip akan muncul saat hover
        direction: 'auto',
        sticky: true
      });
    }

    // 2. Tambahkan event listener untuk klik
    layer.on('click', (e) => {
      // Perbarui state 'selectedFeature' untuk menampilkan detail di info-panel
      selectedFeature.value = feature;
      L.DomEvent.stopPropagation(e); // Mencegah event klik menyebar ke peta di bawahnya
    });

    // 3. Tambahkan event listener untuk hover (mouseover dan mouseout)
    layer.on('mouseover', (e) => {
      e.target.setStyle({
        weight: 3,
        color: '#666',
        fillOpacity: 0.7
      });
    });

    layer.on('mouseout', (e) => {
      // Kembalikan ke style default
      e.target.setStyle(geoJsonOptions.style(feature));
    });
  },
  // ... (lanjutan style, tidak perlu diubah)
  style: (feature) => {
    const realisasi = feature.properties.REALISASI_RP;
    let fillColor = '#d9d9d9';
    // ... (logika pewarnaan choropleth Anda)
    if (realisasi) {
      if (realisasi > 500000000) fillColor = '#084081';
      else if (realisasi > 200000000) fillColor = '#0868ac';
      else if (realisasi > 50000000) fillColor = '#4393c3';
      else if (realisasi > 10000000) fillColor = '#7bccc4';
      else if (realisasi > 1000000) fillColor = '#BAE4BC';
      else fillColor = '#f7fcf0';
    }
    return {
      fillColor: fillColor,
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  }
};

// --- Utility Function ---
/*
const formatRupiah = (value) => {
    if (value === null || value === undefined) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};
*/


const formatRupiah = (value) => {
    // Periksa jika nilai adalah NaN atau tidak valid sebelum memformat
    if (value === null || value === undefined || isNaN(value)) {
        return 'Rp 0';
    }
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};


// --- Lifecycle Hook ---
onMounted(() => {
  fetchData();
});

// --- Watchers ---
// Watch untuk perubahan filter geografis (Kabupaten, Kecamatan, Kalurahan)
// Ini akan memicu filterData untuk memperbarui tampilan peta tanpa re-fetch API
watch([selectedKabupaten, selectedKecamatan, selectedKalurahan], () => {
  filterData();
});

// Watch untuk perubahan filteredGeojson untuk menyesuaikan tampilan peta
// (alternatif dari dalam filterData)
watch(filteredGeojson, (newVal) => {
  if (geojsonLayer.value && geojsonLayer.value.mapObject) {
    const map = geojsonLayer.value.mapObject._map;
    if (newVal.features.length > 0) {
      const bounds = L.geoJSON(newVal).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else {
      // Kembali ke tampilan awal DIY jika tidak ada fitur yang ditampilkan
      map.setView(mapCenter.value, mapZoom.value);
    }
  }
});
</script>


<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

h1 {
  margin-bottom: 20px;
}

.controls {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: center;
  align-items: center;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.controls label {
  font-weight: bold;
  margin-right: 5px;
}

.controls select,
.controls input[type="date"] {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  font-size: 1rem;
  min-width: 150px;
}

#map-container {
  width: 90%;
  max-width: 1200px;
  height: 650px; /* Tinggi peta */
  margin-bottom: 20px;
  border: 1px solid #ddd;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden; /* Pastikan peta tidak meluber */
}

.info-panel {
  width: 90%;
  max-width: 400px;
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  text-align: left;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.info-panel h3 {
  color: #333;
  margin-top: 0;
  margin-bottom: 10px;
}

.info-panel p {
  margin-bottom: 5px;
  line-height: 1.5;
}

.info-panel ul {
  list-style-type: none;
  padding: 0;
  margin-top: 5px;
  margin-bottom: 10px;
}

.info-panel li {
  margin-bottom: 3px;
  color: #555;
}

.info-panel hr {
  border: 0;
  border-top: 1px solid #eee;
  margin: 15px 0;
}
</style>