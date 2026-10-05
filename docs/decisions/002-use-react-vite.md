# ADR 002: React + Vite cho frontend

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-05

## Bối cảnh

App nội bộ sau đăng nhập, không cần SEO hay SSR. Cần build nhanh, hệ sinh thái lớn (kéo thả, bảng, form).

## Quyết định

SPA React + Vite, React Query cho server state, react-router-dom, Tailwind CSS, zod cho form. Deploy Netlify.

## Hệ quả

Không có SSR. Route lazy load để giảm bundle. Mọi biến môi trường web là công khai (`VITE_*`).
