# Arquivos novos - Dashboard + Autenticação (Criar conta / Esqueci a senha)

## 1. Como instalar

Descompacte este zip **dentro da raiz do projeto** (`C:\Projetos faculdade\sistema-dispensa-licitacoes`),
deixando o `src` daqui se fundir com o `src` que já existe. Nenhum arquivo existente é sobrescrito —
são todos arquivos novos, em pastas novas.

Estrutura que será adicionada:

```
src/
├─ pages/
│  ├─ dashboard/index.js                        (novo)
│  ├─ register/index.js                         (novo)
│  ├─ forgot-password/index.js                  (novo)
│  ├─ reset-password/index.js                   (novo)
│  └─ api/v1/auth/
│     ├─ register/index.js                      (novo)
│     ├─ forgot-password/index.js                (novo)
│     └─ reset-password/index.js                 (novo)
└─ components/
   └─ auth/
      ├─ RegisterForm.jsx                       (novo)
      ├─ ForgotPasswordForm.jsx                  (novo)
      └─ ResetPasswordForm.jsx                   (novo)
```

Pode commitar isso sem risco: nenhum arquivo já existente no projeto é alterado por este zip.

## 2. Duas edições manuais ainda são necessárias (fora deste zip)

Estas duas coisas exigem editar arquivos que já existem no seu projeto, por isso não vêm dentro do zip:

### a) `prisma/schema.prisma`

Adicione no final do arquivo:

```prisma
model PasswordResetToken {
  id        String    @id @default(uuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}
```

E dentro do `model User`, junto das outras relações (ex.: perto de `auditLogs`):

```prisma
passwordResetTokens PasswordResetToken[]
```

Depois rode no terminal:

```powershell
npm run db:migrate
```

### b) `src/components/auth/LoginForm.jsx`

Troque:

- `href="#recuperar-senha"` → `href="/forgot-password"`
- `href="#cadastro"` → `href="/register"`

## 3. Testar

- `/dashboard`
- `/register`
- `/forgot-password`
- `/reset-password?token=...`
