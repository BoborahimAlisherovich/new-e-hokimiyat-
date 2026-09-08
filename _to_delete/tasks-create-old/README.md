# Topshiriq Yaratish Sahifasi

Bu sahifa hokimiyat boshqaruv tizimi uchun zamonaviy, bosqichma-bosqich topshiriq yaratish interfeysidir.

## Xususiyatlar

### 5 Bosqichli Jarayon

1. **Asosiy ma'lumotlar** - Topshiriq nomi, tavsifi, kategoriyasi
2. **Mas'ul tashkilotlar** - Asosiy va hamkor tashkilotlar, mas'ul xodim
3. **Muddat va ustuvorlik** - Sanalar, ustuvorlik darajasi, nazorat turi
4. **Fayllar** - Hujjatlar yuklash va qo'shimcha izohlar
5. **Tasdiqlash** - Barcha ma'lumotlarni ko'rib chiqish

### Dizayn

- **Clean & Premium** - Oq card, yumaloq burchaklar, soft shadows
- **Step Navigation** - Chap tomonda vertikal progress indicator
- **Form Validation** - Har bosqichda validatsiya
- **Responsive** - Mobile va desktop uchun moslashtirilgan
- **Government Style** - Rasmiy davlat boshqaruv tizimi uslubi

### Texnik

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Hooks
- File Upload (Drag & Drop)
- Multi-select components

## Foydalanish

```bash
# Sahifaga o'tish
/dashboard/tasks/new

# Yoki Tasks sahifasidan "Yangi topshiriq" tugmasi orqali
```

## Fayl Strukturasi

```
app/dashboard/tasks/new/
  └─ page.tsx                          # Asosiy sahifa

components/dashboard/tasks/create/
  ├─ step-navigation.tsx               # Chap sidebar navigatsiya
  ├─ step1-basic-info.tsx              # 1-bosqich: Asosiy ma'lumotlar
  ├─ step2-organizations.tsx           # 2-bosqich: Tashkilotlar
  ├─ step3-deadline-priority.tsx       # 3-bosqich: Muddat/ustuvorlik
  ├─ step4-files.tsx                   # 4-bosqich: Fayllar
  └─ step5-confirm.tsx                 # 5-bosqich: Tasdiqlash
```

## API Integration

```typescript
// Topshiriq yaratish
await createTask({
  title: formData.title,
  description: formData.description,
  category: formData.category,
  priority: formData.priority,
  organization: formData.primaryOrganization,
  assigned_to: formData.responsibleEmployee,
  due_date: formData.endDate,
  // ...
})
```

## Kelajakdagi Yaxshilashlar

- [ ] Real API integratsiyasi
- [ ] Draft auto-save funksiyasi
- [ ] Audio input (ovozli topshiriq yaratish)
- [ ] Rich text editor topshiriq tavsifi uchun
- [ ] Geolocation/map integration
- [ ] Email/SMS bildirishnomalar
