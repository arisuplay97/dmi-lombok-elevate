import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Asisten Virtual Dirut',
    short_name: 'Asisten Dirut',
    start_url: '/',
    display: 'standalone',
    background_color: '#E9EAEC',
    theme_color: '#14171F',
    icons: [], // tambahkan ikon 192x192 dan 512x512 agar bisa dipasang sebagai PWA
  };
}
