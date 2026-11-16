# Vertigo

Aplicação web (PWA, funciona no telemóvel e no computador; também em Windows e iPhone) para a **vertigem e o sistema vestibular**:
apoio ao diagnóstico, calculadoras de provas, escalas, medições com os sensores do telemóvel e uma área do doente
com diário, reabilitação e resumo para a consulta. Inclui o módulo original de **análise do nistagmo por visão computacional**.

> ⚠ **Protótipo de investigação.** Não é um dispositivo médico certificado. As sugestões não substituem o
> juízo clínico. O conteúdo clínico (regras, critérios, manobras, traduções das escalas) tem de ser revisto pelo médico responsável antes de qualquer uso com doentes.

## Módulos

O ecrã inicial tem dois perfis — **Profissional** e **Doente**. Todos os dados ficam só no dispositivo (`localStorage`; vídeos em IndexedDB), com exportação/importação em JSON (`#/dados`).

### Apoio ao diagnóstico
| Rota | Módulo | Lógica |
|---|---|---|
| `#/vppb` | **Assistente VPPB** — Dix-Hallpike e supine roll test guiados → canal afetado → manobra (Epley, Semont, Lempert/BBQ, Gufoni, Yacovino) com **animação 3D** e cronómetro por passo | `clinical/bppvWizard.ts` (reutiliza `clinical/engine.ts`), `clinical/poses.ts`, `ui/maneuverPlayer.ts` |
| `#/exame` | Exame com vídeo e análise automática do nistagmo (módulo original, descrito abaixo) | `views/exam.ts` |
| `#/hints` | **HINTS / HINTS+** (INFARCT + hipoacusia nova) | `clinical/hints.ts` |
| `#/urgencia` | **Triagem na urgência**: HINTS+, ABCD2, fatores de risco vascular, sinais de alarme, graduação da marcha → quando pedir RM / Neurologia | `clinical/triage.ts` |
| `#/icvd` | **Critérios da Bárány Society (ICVD)** por timing & triggers: VPPB, Ménière definitiva/provável, migrânea vestibular, PPPD, nevrite vestibular, paroxismia, vestibulopatia bilateral, deiscência do canal superior, mal de débarquement — com cada critério marcado ✓/✗/? | `clinical/icvd.ts` |
| `#/vppb-atipica` | **VPPB atípica**: apogeotrópica, canal anterior, multicanal, sinais centrais, **registo de recidivas** | `views/atypical.ts` |

### Calculadoras e relatórios
| Rota | Módulo |
|---|---|
| `#/provas/caloricas` | Paresia canalar (Jongkees), preponderância direcional, hiporreflexia bilateral, índice de fixação |
| `#/provas/vhit` | Ganhos por canal, sacadas cobertas/não cobertas, padrão nervo superior/inferior, critério bilateral |
| `#/provas/vemp` | cVEMP/oVEMP: razão de assimetria, limiares, suspeita de terceira janela |
| `#/provas/relatorio` | **Relatório integrado** → periférica uni/bilateral, central ou terceira janela (imprimível) |
| `#/meniere-aao` | Ménière AAO-HNS 1995: estádio (PTA 4 frequências), nível funcional, classe de controlo da vertigem, pontos para decidir gentamicina/cirurgia |

Lógica em `clinical/labtests.ts` e `clinical/meniere.ts`; limiares configuráveis.

### Questionários e escalas (`#/escalas`, `#/quedas`)
DHI, VSS-SF, ABC, NPQ, MSSQ-short; risco de queda: **TUG** (cronómetro), DGI, FGA e Berg (com cronómetro nas tarefas temporizadas). Histórico e gráfico de evolução. `clinical/scales.ts`.
As traduções são de trabalho — para investigação usar as versões portuguesas validadas.

### Medições com o telemóvel (experimentais)
| Rota | Medição | Sensor |
|---|---|---|
| `#/sensores/nistagmo` | Gravação do nistagmo em casa + estimativa da direção (tracking ocular) | câmara + MediaPipe |
| `#/sensores/vvs` | Vertical visual subjetiva — teste do balde ou linha no ecrã | orientação (giroscópio/acelerómetro) |
| `#/sensores/dva` | Acuidade visual dinâmica — E de Snellen calibrado (logMAR), só aparece com a cabeça acima de uma velocidade | câmara frontal (pose da cabeça) |
| `#/sensores/postura` | Posturografia simplificada — Romberg e mCTSIB (RMS, área da elipse 95 %, jerk) | acelerómetro (telemóvel na cintura) |
| `#/sensores/epley` | Manobra guiada: compara a gravidade medida no referencial da cabeça com a posição-alvo de cada passo; conta o tempo só dentro da tolerância; instruções por voz | orientação (telemóvel preso à cabeça, calibração em 2 passos) |

### Para o doente
`#/doente/crise` e `#/doente/dia` (diário de crises e fatores diários: sal, cafeína, álcool, stress, sono, audição, acufeno), `#/doente/diario` (gráficos, associação fator→crise, exportação CSV), `#/doente/audicao` (teste de audição relativo nas frequências graves), `#/doente/migranea` (profilaxia e resposta ≥ 50 %), `#/doente/reabilitacao` (Cawthorne-Cooksey, equilíbrio, programa, **lembretes .ics**, adesão), `#/doente/vor` (VOR x1/x2 com alvo, metrónomo e confirmação do movimento da cabeça pela câmara), `#/doente/habituacao` (estímulos optocinéticos progressivos com doseamento pelos sintomas, modo VR), `#/educacao` e `#/resumo` (**resumo de uma página em PDF** para a consulta).

---

## Módulo original: análise do nistagmo por vídeo (`#/exame`)

- **Captura**
  - *Câmara em direto*: o telemóvel filma o rosto do doente (câmara traseira por defeito); botão **«Posição atingida»** marca t0 para medir a latência.
  - *Ficheiro de vídeo*: analisa vídeos gravados (p. ex. de óculos de videonistagmografia ou de Frenzel com câmara).
  - *Registo manual*: introduzir as características observadas, sem vídeo.
- **Dois modos de visão computacional**
  - *Rosto inteiro* — [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (478 pontos, incluindo íris). Posição olho-na-cabeça calculada no referencial da cabeça (corrige a inclinação da cabeça); média ponderada dos dois olhos; deteção de pestanejo.
  - *Grande plano do olho* (IV / óculos de vídeo) — deteção da pupila escura (limiar adaptativo, componentes ligados, preenchimento de reflexos corneanos).
  - Em ambos: **componente torsional** estimado pela rotação do padrão da íris (perfil polar + correlação circular, com re-referenciação automática).
- **Análise do nistagmo** (`src/analysis/nystagmus.ts`)
  - deteção das fases rápidas; **SPV** (velocidade da fase lenta) por componente H/V/T em janelas deslizantes;
  - direção (fase rápida), latência, duração, persistência, perfil crescendo-decrescendo, mudança de direção na mesma posição, frequência;
  - gráfico interativo do registo; o clínico confirma/corrige as características antes de guardar.
- **Motor clínico** (`src/clinical/engine.ts`) — combina todas as provas do exame:

| Achado | Sugestão |
|---|---|
| DH lado X: upbeat + torsional geotrópico (polo superior → orelha X), < 60 s | VPPB canal posterior X, canalolitíase → **Epley X** (alt. Semont) |
| Idem, > 60 s / persistente | Cupulolitíase do canal posterior → **Semont X** (alt. Epley) |
| Downbeat posicional (± torsional) | Canal anterior → **Yacovino**; alerta central se puro/persistente/sem latência |
| Roll test geotrópico bilateral | Canal horizontal, lado = nistagmo **mais** intenso → **Lempert/BBQ**, Gufoni, Vannucchi |
| Roll test apogeotrópico bilateral | Canal horizontal, lado = nistagmo **menos** intenso → **Gufoni (variante apogeotrópica)** |
| Roll test com direção fixa | Não é VPPB: nistagmo espontâneo modulado pela posição → HINTS |
| Espontâneo vertical / torsional puro | **Central** |
| Evocado pelo olhar com direção alternante | **Central** (HINTS) |

  Inclui checklist de sinais de alarme (sintomas neurológicos, cefaleia, ataxia, hipoacusia súbita, risco vascular) e próximos passos.

- **Privacidade**: o vídeo é processado **apenas no dispositivo**; nada é enviado para servidores. Os exames (sem vídeo) ficam guardados localmente e podem ser exportados em JSON ou impressos.

## Convenções

Tudo no **referencial do doente**: H + = direita, V + = cima, T + = polo superior para a orelha direita
(= anti-horário visto pelo examinador). A direção do nistagmo é a da **fase rápida**.

## Instalação

### iPhone / iPad

**Opção A — app web instalável (já disponível, sem App Store).**
A Vertigo é uma PWA: depois de publicada num endereço HTTPS (o workflow `Web / iPhone` publica-a no GitHub Pages),
abra o endereço no **Safari** → botão Partilhar → **«Adicionar ao ecrã principal»**. Fica com ícone próprio, abre em
ecrã inteiro, usa a câmara e funciona offline depois da primeira utilização.

**Opção B — app nativa (App Store / TestFlight).** O projeto Xcode está em `ios/` (Capacitor). Requer um Mac com Xcode
e uma conta Apple Developer:

```bash
npm install
npm run ios          # build web + sincroniza com ios/ + abre o Xcode
```

No Xcode: *Signing & Capabilities* → escolher a equipa → *Product ▸ Archive* → distribuir via TestFlight/App Store.
O pedido de acesso à câmara (`NSCameraUsageDescription`) já está configurado em português.

### Windows (.exe)

- `Vertigo-Setup-<versão>.exe` — instalador (cria atalho no menu Iniciar);
- `Vertigo-<versão>-portable.exe` — executável único, sem instalação.

Gerados pelo workflow **Windows (.exe)** do GitHub Actions (botão *Run workflow*, ou automaticamente ao criar uma tag `v*`,
que os anexa à release). Localmente: `npm run dist:win` (em Windows; em Linux requer o Wine).
Os executáveis não estão assinados digitalmente: o Windows SmartScreen mostra um aviso («Mais informações» → «Executar mesmo assim»).
Para distribuição alargada convém um certificado de assinatura de código.

A versão de computador funciona totalmente offline (modelo e runtime incluídos) e só pede permissão para a câmara.

## Desenvolvimento

```bash
npm install          # instala dependências e copia o WASM/modelo do MediaPipe para public/ (uso offline)
npm run dev          # servidor de desenvolvimento (a câmara requer https ou localhost)
npm test             # testes unitários (análise, motor clínico, tracking de pupila e torção)
npm run build        # build de produção em dist/
```

Teste ponta-a-ponta com um olho sintético (vídeo gerado com nistagmo de VPPB do canal posterior direito):

```bash
node scripts/make-synthetic-y4m.mjs test-videos/pc-right.y4m
ffmpeg -i test-videos/pc-right.y4m -c:v libvpx-vp9 -lossless 1 test-videos/pc-right.webm
npm run build && npx vite preview --port 4173 &
npm run e2e          # demo + ficheiro de vídeo + câmara falsa do Chromium
```

### Estrutura

```
src/
  core/       router (hash), armazenamento local, sensores, áudio, gráficos SVG, tracking da cabeça
  analysis/   reamostragem, filtros, deteção de nistagmo (puro, testável)
  tracking/   pupila (grande plano), torção da íris, MediaPipe, fontes de vídeo
  clinical/   lógica clínica pura e testada: motor VPPB, HINTS, triagem, ICVD, escalas, provas, Ménière, poses, diário, métricas dos sensores
  content/    exercícios de reabilitação e textos de educação
  views/      ecrãs (diagnóstico, calculadoras, escalas, sensors/, patient/)
  demo/       gerador de nistagmo e de olho sintético
  ui/         gráfico, formulários, glifo do nistagmo, ícones
tests/        vitest
scripts/      assets offline, vídeo sintético, e2e
brand/        logotipo (SVG), ícones PNG/ICO, folha de apresentação
desktop/      aplicação Windows (Electron)
ios/          projeto Xcode (Capacitor)
.github/      workflows: .exe Windows e publicação web (PWA)
```

## Limitações conhecidas e próximos passos

- **Fixação visual**: com luz e olhos abertos o nistagmo periférico é suprimido. Idealmente usar óculos de Frenzel/vídeo com IV; com o telemóvel, filmar em ambiente escurecido.
- **Resolução**: com o rosto inteiro, a íris tem poucos píxeis — a torção só é estimada se o raio da íris ≥ 10 px (aproximar o telemóvel). O modo grande plano é mais fiável.
- **Calibração**: graus estimados a partir da anatomia média (sem calibração individual). As velocidades são aproximadas; as direções são o mais robusto.
- **Movimentos de cabeça** durante a manobra: a análise só considera o período após «Posição atingida».
- **Validação clínica**: o modo rosto foi testado apenas quanto ao carregamento e execução do modelo; precisa de vídeos reais anotados (idealmente comparados com VNG) para afinar limiares e medir sensibilidade/especificidade.
- **Gufoni apogeotrópico**: as descrições publicadas diferem no sentido da rotação final da cabeça — está marcado na app como «validar protocolo».
- **Regulamentar**: software que sugere diagnóstico é provavelmente dispositivo médico (UE MDR, classe IIa pela regra 11) — necessário antes de uso clínico fora de investigação. Dados de saúde: RGPD.
