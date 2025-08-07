import axios from 'axios'

const api = axios.create({
  baseURL: 'http://192.168.4.7:6600/api',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'NBdf^A+ZiWT9YF3s*np&?ubSsn7Rn3yMB3CR&t)J^*k]E}GxBDa=G(gEry%E'  // Replace with your actual API key
  }
})

export const bpajakService = {
  getBpajakData(tahun, tglawal, tglakhir) {
    return api.get(`/realisasikal?THN_PAJAK_SPPT=${tahun}&TGL_PEMBAYARAN_SPPT=${tglawal}&TGL_PEMBAYARAN_SPPT=${tglakhir}`)
  },
  
  mounted() {
    console.log('bpajakService:', bpajakService);
  },
  
}


/*
import axios from 'axios'
const api = axios.create({
  baseURL: 'http://192.168.4.7:5050/api',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'NBdf^A+ZiWT9YF3s*np&?ubSsn7Rn3yMB3CR&t)J^*k]E}GxBDa=G(gEry%E'  // Replace with your actual API key
  }
})

export const bpajakService = {
  getBpajakData(kd_kec, kd_kel, thn_pajak_sppt) {
    return api.get(`/selectstatuspbb?kd_kec=${kd_kec}&kd_kel=${kd_kel}&thn_pajak_sppt=${thn_pajak_sppt}`)
  },
  
  updateKeterangan(data) {
    return api.put('/updatestatussppt', data)
  }
}
*/
