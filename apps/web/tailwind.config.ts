import type { Config } from 'tailwindcss';

// Nguồn duy nhất cho màu sắc, spacing, bo góc. Không hard-code giá trị trong component.
// Quy ước màu: docs/ui-ux/colors.md. Dùng TÊN THEO VAI TRÒ (primary, accent, info...), không theo màu.
// `colors` (không nằm trong `extend`) thay thế bảng màu mặc định -> class như bg-red-500 không tồn tại.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      // Thương hiệu: logo, nút chính, menu/tab active, selected
      primary: {
        50: '#F5F2F9',
        100: '#EBE4F2',
        200: '#D6CAE5',
        300: '#BFACD7',
        400: '#9F83C3',
        500: '#7F59AF',
        600: '#6C4C95',
        700: '#593E7B',
        800: '#3E2C56',
        900: '#241931',
      },
      // Điểm nhấn (pink): badge đặc biệt, HR/People, notification. Không dùng làm nền lớn
      accent: {
        50: '#FDF1F6',
        100: '#FCE2EC',
        200: '#F8C5DA',
        300: '#F5A5C5',
        400: '#EF78A8',
        500: '#EA4B8B',
        600: '#C74076',
        700: '#A43561',
        800: '#732544',
        900: '#421527',
      },
      // Info (blue): việc đang làm, progress, chart. Chữ trên nền 500 phải là gray-900
      info: {
        50: '#F3FAFD',
        100: '#E6F6FC',
        200: '#CDECF8',
        300: '#B1E2F5',
        400: '#8AD4EF',
        500: '#63C5EA',
        600: '#4E9CB9',
        700: '#397288',
        800: '#28505F',
        900: '#172E36',
      },
      // Warning (orange): deadline sắp tới, pending. Chữ trên nền 500 phải là gray-900
      warning: {
        50: '#FFF9ED',
        100: '#FFF3DC',
        200: '#FFE6B9',
        300: '#FFD992',
        400: '#FFC55B',
        500: '#FFB224',
        600: '#C68A1C',
        700: '#8C6214',
        800: '#62450E',
        900: '#382708',
      },
      // Success: đã hoàn thành
      success: {
        50: '#EDF7F3',
        100: '#DCF0E7',
        200: '#B8E1D0',
        300: '#91D0B5',
        400: '#59B890',
        500: '#22A06B',
        600: '#1D885B',
        700: '#18704B',
        800: '#114E34',
        900: '#0A2D1E',
      },
      // Danger: quá hạn, Urgent, lỗi, xoá
      danger: {
        50: '#FDF0F1',
        100: '#FBE2E3',
        200: '#F7C4C6',
        300: '#F2A4A6',
        400: '#EC767A',
        500: '#E5484D',
        600: '#C33D41',
        700: '#A03236',
        800: '#702326',
        900: '#401416',
      },
      // Neutral: nền, viền, chữ. Chữ chính gray-900, chữ phụ gray-500
      gray: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827',
      },
    },
    extend: {
      spacing: {
        sidebar: '16rem',
        header: '3.5rem',
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
} satisfies Config;
