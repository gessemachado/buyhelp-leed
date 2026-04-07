# OCR Crachá — Captura de Lead por Foto Specification

## Problem Statement

No processo atual, o captor de lead precisa digitar manualmente os dados da pessoa (nome, telefone, email) durante eventos. Isso gera lentidão, erros de digitação e fricção na abordagem. Com OCR, o captor fotografa o crachá e o sistema extrai os dados automaticamente, agilizando o cadastro e reduzindo erros.

## Goals

- [ ] Capturar foto do crachá diretamente pela câmera do dispositivo
- [ ] Extrair automaticamente nome, telefone e email via OCR/leitura de QR code
- [ ] Permitir revisão e edição dos dados antes de salvar o lead
- [ ] Reduzir o tempo de cadastro de um lead em eventos

## Out of Scope

| Feature | Reason |
|---|---|
| Importar imagem da galeria | Foco no fluxo ao vivo em eventos; galeria é secundário |
| Leitura de múltiplos crachás por foto | Complexidade desnecessária para MVP |
| Salvar/armazenar a foto do crachá | Privacidade; só os dados extraídos são persistidos |
| OCR offline | Requer API em nuvem para qualidade aceitável |
| Leitura de código de barras 1D | Crachás corporativos usam QR code |

---

## User Stories

### P1: Fotografar crachá e extrair dados ⭐ MVP

**User Story**: Como captor de lead em um evento, quero fotografar o crachá da pessoa para que o sistema preencha automaticamente o formulário com nome, telefone e email.

**Por que P1**: É o núcleo da funcionalidade — sem isso não existe o feature.

**Acceptance Criteria**:

1. WHEN o usuário toca em "Fotografar Crachá" na tela de captura THEN o sistema SHALL abrir a câmera do dispositivo
2. WHEN o usuário tira a foto THEN o sistema SHALL enviar a imagem para a API de OCR
3. WHEN a API retorna os dados THEN o sistema SHALL preencher automaticamente os campos nome, telefone e email no formulário
4. WHEN o OCR não consegue extrair um campo THEN o sistema SHALL deixar o campo em branco (sem erro bloqueante)
5. WHEN o crachá contém QR code THEN o sistema SHALL tentar ler o QR code antes do OCR de texto, priorizando os dados estruturados

**Independent Test**: Abrir tela de captura → tocar em "Fotografar Crachá" → tirar foto de crachá de teste → ver campos preenchidos automaticamente.

---

### P2: Revisar e editar dados antes de salvar

**User Story**: Como captor de lead, quero revisar e corrigir os dados extraídos pelo OCR antes de salvar, para garantir que o lead seja cadastrado corretamente.

**Por que P2**: O OCR pode errar; o usuário precisa de controle antes de confirmar.

**Acceptance Criteria**:

1. WHEN os dados são extraídos THEN o sistema SHALL exibir um preview editável com os campos preenchidos
2. WHEN o usuário edita qualquer campo THEN o sistema SHALL atualizar o valor sem perder os demais
3. WHEN o usuário confirma THEN o sistema SHALL salvar o lead com os dados revisados
4. WHEN o usuário quer tentar novamente THEN o sistema SHALL permitir retirar a foto sem perder o evento selecionado

**Independent Test**: Após OCR extrair dados incorretos → editar campo nome → salvar → confirmar que o valor salvo é o editado.

---

### P3: Indicador de confiança do OCR

**User Story**: Como captor de lead, quero ver quais campos foram extraídos com alta/baixa confiança, para saber onde prestar mais atenção na revisão.

**Por que P3**: Melhora UX mas não é bloqueante para o MVP.

**Acceptance Criteria**:

1. WHEN a API retorna score de confiança por campo THEN o sistema SHALL destacar visualmente campos com confiança baixa (ex: borda amarela)
2. WHEN todos os campos têm alta confiança THEN o sistema SHALL não exibir nenhum destaque especial

---

## Edge Cases

- WHEN a câmera é negada pelo usuário THEN sistema SHALL exibir mensagem orientando a habilitar a permissão
- WHEN a API de OCR retorna erro ou timeout THEN sistema SHALL exibir mensagem e permitir preenchimento manual
- WHEN a foto está desfocada ou escura THEN sistema SHALL retornar campos vazios (sem travar o fluxo)
- WHEN o QR code aponta para URL sem dados estruturados THEN sistema SHALL ignorar QR e usar OCR de texto
- WHEN o usuário cancela após a foto THEN sistema SHALL descartar a imagem e voltar ao formulário vazio

---

## Decisão Pendente: API de OCR

Nenhuma API está definida. Opções recomendadas:

| Opção | Prós | Contras |
|---|---|---|
| **OpenAI Vision (GPT-4o)** | Entende contexto, extrai campos semânticos, lida bem com layout variado | Custo por chamada, latência |
| **Google Cloud Vision** | OCR preciso + QR code nativo, pricing previsível | Requer projeto GCP, dois passos (OCR + parse) |
| **Tesseract.js** | Grátis, roda no browser, sem API key | Qualidade inferior em fontes variadas, lento |

**Recomendação**: OpenAI Vision — uma única chamada com prompt "extraia nome, telefone e email deste crachá" retorna JSON direto, sem precisar parsear o texto bruto.

---

## Requirement Traceability

| Requirement ID | Story | Status |
|---|---|---|
| OCR-01 | P1: Abrir câmera ao tocar no botão | Pending |
| OCR-02 | P1: Enviar imagem para API de OCR | Pending |
| OCR-03 | P1: Preencher campos automaticamente | Pending |
| OCR-04 | P1: Priorizar QR code sobre OCR de texto | Pending |
| OCR-05 | P1: Campo vazio quando OCR não extrai | Pending |
| OCR-06 | P2: Preview editável dos dados extraídos | Pending |
| OCR-07 | P2: Permitir nova foto sem perder contexto | Pending |
| OCR-08 | P3: Indicador de confiança por campo | Pending |

**Coverage:** 8 total, 0 mapeados em tasks, 8 pendentes

---

## Success Criteria

- [ ] Captor consegue cadastrar um lead fotografando o crachá em menos de 30 segundos
- [ ] Taxa de acerto do OCR ≥ 80% nos campos nome e email em crachás com texto legível
- [ ] Zero leads perdidos por falha do OCR (sempre permite fallback manual)
