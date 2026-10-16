---
title: A map of the world-model literature
date: 2026-10-16
live: true
tags: [world-models, planning]
summary: A living map of world-model research and industry, grouped by approach, with a short description and links for every paper.
---

This is a map of the world-model literature: research papers and industry releases,
grouped by approach. Every entry opens to a short description, with a link to the paper
and to my post when I have written one. I keep adding new work as it appears.

A **world model** predicts how an environment changes, usually given an action, so that
an agent can plan or learn inside it instead of in the real world. The approaches below
mostly differ in *what* they predict: pixels, compact latent states, or abstract
representations.

| Approach | What it predicts | Examples |
| --- | --- | --- |
| Model-based RL | Latent states, rewards and values | Dreamer, MuZero, TD-MPC2 |
| Generative worlds | Future frames, as video | Genie, Cosmos, Sora |
| Joint-embedding (JEPA) | Representations, no pixels | V-JEPA 2, LeWorldModel |

## Foundations

The ideas everything else builds on.

{

Learns a model of the environment from real experience, then uses simulated experience from that model to improve its policy, interleaving the two. It is the earliest clear statement of the loop most world-model agents still use.

[Paper](https://dl.acm.org/doi/10.1145/122344.122377)

}{cfyb paper: Dyna (1991) — learn a model, then learn from it}

{

Each frame is compressed with a VAE, a recurrent network predicts the next latent, and a tiny controller is trained on top. The controller can even be trained entirely inside the learned model and transferred back to the real game.

[Paper](https://arxiv.org/abs/1803.10122)

}{cfyb paper: World Models (2018) — train an agent inside its own dream}

{

A position paper: an agent built around a world model that predicts in representation space, energy-based training, JEPA, and hierarchical planning with H-JEPA.

[Paper](https://openreview.net/pdf?id=BZ5a1r-kVsf) · [My post](../path-towards-autonomous-machine-intelligence/)

}{cfyb paper post: A Path Towards Autonomous Machine Intelligence (2022) — LeCun's blueprint}

## Self-supervised representation learning

The encoders that world models are built on, learned without labels. Most of these papers are also milestones in the fight against collapse, covered in my [Avoiding collapse](../avoiding-collapse/) post.

{

Keeps a queue of negatives encoded by a slowly updated (EMA) copy of the network, making contrastive learning work with ordinary batch sizes.

[Paper](https://arxiv.org/abs/1911.05722) · [In my collapse post](../avoiding-collapse/)

}{cfyb paper: MoCo (2019) — contrastive learning with a momentum encoder}

{

Uses every other image in a large batch as a negative, with strong augmentations and a projection head. A simple recipe that set the standard.

[Paper](https://arxiv.org/abs/2002.05709) · [In my collapse post](../avoiding-collapse/)

}{cfyb paper: SimCLR (2020) — contrastive learning with large batches}

{

Shows that negatives are not needed: an online network with a predictor matches an EMA target network behind a stop-gradient.

[Paper](https://arxiv.org/abs/2006.07733) · [In my collapse post](../avoiding-collapse/)

}{cfyb paper: BYOL (2020) — no negatives: EMA teacher and predictor}

{

Predicts the cluster code of one view from another, forcing clusters to be used evenly with the Sinkhorn–Knopp algorithm.

[Paper](https://arxiv.org/abs/2006.09882) · [In my collapse post](../avoiding-collapse/)

}{cfyb paper: SwAV (2020) — contrastive clustering with balanced codes}

{

Removes the EMA teacher and shows that a predictor plus a stop-gradient alone prevents collapse.

[Paper](https://arxiv.org/abs/2011.10566) · [In my collapse post](../avoiding-collapse/)

}{cfyb paper: SimSiam (2020) — a stop-gradient is enough}

{

Makes the two views agree dimension by dimension while decorrelating different dimensions.

[Paper](https://arxiv.org/abs/2103.03230) · [In my collapse post](../avoiding-collapse/)

}{cfyb paper: Barlow Twins (2021) — push the cross-correlation toward the identity}

{

A student learns to match an EMA teacher's outputs. The resulting ViT features show object segmentation without any supervision.

[Paper](https://arxiv.org/abs/2104.14294) · [In my collapse post](../avoiding-collapse/)

}{cfyb paper: DINO (2021) — self-distillation with centering and sharpening}

{

Prevents collapse with three explicit terms, the method the 2022 blueprint recommends for training a JEPA.

[Paper](https://arxiv.org/abs/2105.04906) · [In my collapse post](../avoiding-collapse/)

}{cfyb paper: VICReg (2021) — variance, invariance and covariance}

{

Hides 75% of the patches and reconstructs them with a light decoder. Simple and scalable, but the features are lower level than those of predictive methods.

[Paper](https://arxiv.org/abs/2111.06377) · [In my collapse post](../avoiding-collapse/)

}{cfyb paper: MAE (2021) — mask most of an image, reconstruct the pixels}

{

Combines DINO-style self-distillation with masked image modeling, predicting the teacher's outputs for masked patches.

[Paper](https://arxiv.org/abs/2111.07832)

}{cfyb paper: iBOT (2021) — masked prediction with an online tokenizer}

{

Predicts the teacher's contextualised representations of masked inputs, with the same method across three modalities.

[Paper](https://arxiv.org/abs/2202.03555)

}{cfyb paper: data2vec (2022) — one objective for vision, speech and text}

{

Scales DINO and iBOT on a curated dataset, producing frozen features that work across many tasks. The encoder behind DINO-WM.

[Paper](https://arxiv.org/abs/2304.07193)

}{cfyb paper: DINOv2 (2023) — general-purpose visual features at scale}

{

A 7B-parameter model trained on 1.7B images, with Gram anchoring to keep dense features clean during long training.

[Paper](https://arxiv.org/abs/2508.10104)

}{cfyb paper: DINOv3 (2025) — a 7B self-supervised vision backbone}

## Model-based reinforcement learning

Learn a compact latent model of the environment, then plan or train a policy inside it. Most of these learn the latent by reconstructing observations or predicting rewards.

{

Introduces the recurrent state-space model (RSSM), with a deterministic and a stochastic latent path, trained by reconstructing frames. Actions are planned directly in latent space with the cross-entropy method.

[Paper](https://arxiv.org/abs/1811.04551)

}{cfyb paper: PlaNet (2019) — plan in a learned latent space, from pixels}

{

Learns a model that predicts only what planning needs (reward, value and policy) and searches it with MCTS. It matches AlphaZero in Go, chess and shogi without being given the rules.

[Paper](https://arxiv.org/abs/1911.08265)

}{cfyb paper: MuZero (2020) — a model of value, reward and policy, not pixels}

{

An actor and a critic are trained entirely on trajectories imagined by the world model, with gradients flowing back through the learned dynamics.

[Paper](https://arxiv.org/abs/1912.01603)

}{cfyb paper: Dreamer (2020) — learn behaviour by latent imagination}

{

Switches to categorical latent variables and reaches human-level performance on the 55-game Atari benchmark with a policy learned purely inside the world model.

[Paper](https://arxiv.org/abs/2010.02193)

}{cfyb paper: DreamerV2 (2021) — discrete latents, human-level Atari}

{

Frames are turned into discrete tokens by an autoencoder, and an autoregressive transformer predicts the next tokens. The agent learns in imagination and does well on the data-limited Atari 100k benchmark.

[Paper](https://arxiv.org/abs/2209.00588)

}{cfyb paper: IRIS (2023) — a transformer as the world model}

{

The same hyperparameters work across very different domains. It was the first agent to collect diamonds in Minecraft from scratch, without human data. Published in Nature in 2025.

[Paper](https://arxiv.org/abs/2301.04104)

}{cfyb paper: DreamerV3 (2023) — one configuration across 150+ tasks}

{

Learns latent dynamics without reconstructing observations, using latent consistency plus reward and value prediction, and plans with MPPI. A single 317M-parameter agent handles 80 tasks across several domains.

[Paper](https://arxiv.org/abs/2310.16828)

}{cfyb paper: TD-MPC2 (2024) — a decoder-free world model for control}

{

A diffusion model predicts the next frame and the agent is trained inside it, with strong Atari 100k results. The same approach gives a playable model of Counter-Strike.

[Paper](https://arxiv.org/abs/2405.12399)

}{cfyb paper: DIAMOND (2024) — a diffusion model as the world model}

{

A 2B-parameter world model, trained with a new shortcut-forcing objective, with the policy learned purely inside it, from a fixed offline dataset. This is the first agent to obtain diamonds in Minecraft this way.

[Paper](https://arxiv.org/abs/2509.24527)

}{cfyb paper: Dreamer 4 (2025) — Minecraft diamonds from offline data only}

{

Uses the world model only when choosing actions: the policy and Q-function are trained on real transitions, and the model searches imagined trajectories for high-value actions. This avoids the compounding bias of training inside imagined rollouts. Tested on the Robomimic and LIBERO manipulation benchmarks.

[Paper](https://arxiv.org/abs/2608.17163)

}{cfyb paper: QWM (2026) — Q-learning plus search in a world model}

{

Gives a robot world model a small learned environment latent for factors it cannot see, such as friction, mass or task rules. At test time the world model stays frozen and only this latent is fitted from one or a few interactions. Across 7 simulated settings and 4 real-robot tasks, action success rises from 33.73% to 72.96%.

[Paper](https://arxiv.org/abs/2610.22364)

}{cfyb paper: T2-Z (2026) — adapting a world model to hidden physics at test time}

## Generative video and game worlds

Generate the future as video, often interactively from actions or text. Visually the most impressive line, and the one most of industry is betting on.

{

A 9B-parameter model that generates driving videos conditioned on past video, text and actions, used to simulate scenarios for autonomous driving.

[Paper](https://arxiv.org/abs/2309.17080)

}{cfyb paper: GAIA-1 (2023) — a generative world model for driving}

{

Combines many datasets into one interactive video simulator that responds to actions, from high-level instructions to low-level controls. Policies trained inside it transfer to the real world.

[Paper](https://arxiv.org/abs/2310.06114)

}{cfyb paper: UniSim (2023) — a learned simulator of the real world}

{

A technical report arguing that scaling video generation leads to world simulators: a diffusion transformer over spacetime patches shows some 3D consistency and object permanence, while still failing on basic physics such as breaking glass.

[Report](https://openai.com/index/video-generation-models-as-world-simulators/)

}{cfyb paper: Sora (2024) — video generation as world simulation}

{

An 11B-parameter model trained on internet videos of platform games. It learns its own discrete actions without any action labels, so a single image becomes a playable world.

[Paper](https://arxiv.org/abs/2402.15391)

}{cfyb paper: Genie (2024) — playable worlds from unlabelled videos}

{

A diffusion model runs the game DOOM in real time at about 20 frames per second, so that human raters struggle to tell short clips from the real game.

[Paper](https://arxiv.org/abs/2408.14837)

}{cfyb paper: GameNGen (2024) — DOOM, simulated by a neural network}

{

A foundation world model that generates action-controllable 3D environments from a single image prompt, for training and evaluating embodied agents.

[Blog](https://deepmind.google/discover/blog/genie-2-a-large-scale-foundation-world-model/)

}{cfyb paper: Genie 2 (2024) — playable 3D environments from one image}

{

A platform of open video world models (diffusion and autoregressive), tokenizers and data pipelines, meant to be fine-tuned for robotics and driving.

[Paper](https://arxiv.org/abs/2501.03575)

}{cfyb paper: Cosmos (2025) — world foundation models for physical AI}

{

A 1B-parameter conditional diffusion transformer trained on egocentric videos of humans and robots, planning routes by simulating candidate trajectories.

[Paper](https://arxiv.org/abs/2412.03572)

}{cfyb paper: Navigation World Models (2025) — plan navigation by imagining it}

{

Wayve's follow-up to GAIA-1: a latent diffusion model that generates consistent multi-camera driving video, controlled by the ego vehicle's dynamics, other agents, environmental factors and road layout, across the UK, the US and Germany.

[Paper](https://arxiv.org/abs/2503.20523)

}{cfyb paper: GAIA-2 (2025) — controllable multi-camera driving worlds}

{

Generates worlds you can explore in real time at 720p and 24 frames per second, consistent for a few minutes, and lets you change them with text prompts while you play.

[Blog](https://deepmind.google/discover/blog/genie-3-a-new-frontier-for-world-models/)

}{cfyb paper: Genie 3 (2025) — real-time interactive worlds}

{

The next generation of Cosmos: one flow-based model for text-, image- and video-to-world generation, trained on 200M curated video clips and refined with reinforcement learning. Released openly at 2B and 14B parameters.

[Paper](https://arxiv.org/abs/2511.00062)

}{cfyb paper: Cosmos-Predict2.5 (2025) — one open model for text, image and video to world}

{

Waymo adapts Genie 3 to driving. It generates camera and lidar data for rare situations its fleet has never recorded, and engineers control it with language prompts, driving inputs and scene layouts.

[Blog](https://waymo.com/blog/2026/02/the-waymo-world-model-a-new-frontier-for-autonomous-driving-simulation)

}{cfyb paper: Waymo World Model (2026) — Genie 3 adapted to driving simulation}

{

An open model that understands and generates text, images, video, sound and actions. A reasoning transformer is paired with a generation transformer (a mixture of transformers), so vision reasoning, world generation and action prediction live in one system.

[Announcement](https://nvidianews.nvidia.com/news/nvidia-launches-cosmos-3-the-open-frontier-foundation-model-for-physical-ai)

}{cfyb paper: Cosmos 3 (2026) — one open model for reasoning, generation and actions}

{

World Labs' omni world model, a multimodal autoregressive diffusion transformer pretrained on text, images, video and 3D. It generates camera-controlled video of up to one minute at 1440p, reconstructs scenes from a few photos, and outputs explicit 3D as point clouds or Gaussian splats. In early access; it will power future versions of Marble.

[Blog](https://www.worldlabs.ai/blog/atlas)

}{cfyb paper: Atlas (2026) — generate, reconstruct and simulate 3D worlds}

{

A real-time diffusion world model that runs on consumer GPUs. Trained on 100,000 hours of video from hundreds of games, it generates playable video from full keyboard and mouse input.

[Paper](https://arxiv.org/abs/2609.37107)

}{cfyb paper: Waypoint-1.5 (2026) — interactive worlds on consumer hardware}

{

Generates video and spatial stereo sound together, conditioned on camera motion and keyboard actions: when the camera turns, the sound field turns with it. Runs at 24 frames per second on a single GPU.

[Paper](https://arxiv.org/abs/2609.38123)

}{cfyb paper: HelixWorld (2026) — an interactive world you can also hear}

## Joint-embedding world models (JEPA)

Predict in representation space, with no reconstruction of pixels. My main focus, so most of my posts are here. Split into the core line, planning with JEPA world models, and JEPAs outside vision.

### The core line

Learning the representations themselves.

{

Predict the representations of masked image blocks from a visible context block. Multi-block masking makes it work, and an EMA target encoder prevents collapse.

[Paper](https://arxiv.org/abs/2301.08243) · [My post](../i-jepa/)

}{cfyb paper post: I-JEPA (2023) — the first working JEPA, for images}

{

Learns optical flow and content features jointly in a shared encoder, an early step toward JEPAs that understand motion.

[Paper](https://arxiv.org/abs/2307.12698)

}{cfyb paper: MC-JEPA (2023) — motion and content in one encoder}

{

I-JEPA for video: masked blocks span the whole clip in time, and features are predicted
instead of pixels. It beats pixel-reconstruction video models with far less training.

[Paper](https://arxiv.org/abs/2404.08471)

}{cfyb paper: V-JEPA (2024) — I-JEPA for video}

{

Scales V-JEPA to over a million hours of video and a 1B-parameter encoder. V-JEPA 2-AC
then freezes it and learns an action-conditioned predictor from 62 hours of robot video,
planning pick-and-place zero-shot in new labs.

[Paper](https://arxiv.org/abs/2506.09985)

}{cfyb paper: V-JEPA 2 (2025) — scale, then plan robot actions}

{

Adds a loss on the visible tokens and at several encoder layers, so per-patch features
become strong enough for depth and segmentation while global understanding is kept.

[Paper](https://arxiv.org/abs/2603.14482)

}{cfyb paper: V-JEPA 2.1 (2026) — strong dense features}

{

Proves which distribution embeddings should follow and enforces it with SIGReg, replacing EMA teachers and stop-gradients with one principled constraint.

[Paper](https://arxiv.org/abs/2511.08544) · [My post](../lejepa/)

}{cfyb paper post: LeJEPA (2025) — the isotropic Gaussian and SIGReg}

{

Gögl and Yau show that JEPAs can be read as deterministic versions of variational generative models, and optimise an evidence lower bound instead, which also gives uncertainty estimates. ICML 2026.

[Paper](https://arxiv.org/abs/2603.20111)

}{cfyb paper: Var-JEPA (2026) — JEPA as a variational model}

{

Replaces the Gaussian target of SIGReg with a rectified generalized Gaussian, so embeddings become sparse and non-negative, with explicit control over how many dimensions are active.

[Paper](https://arxiv.org/abs/2602.01456)

}{cfyb paper: Rectified LpJEPA (2026) — sparse embeddings by distribution matching}

{

Shows that for nearest-neighbour and kernel probes, the best embedding distribution on a hypersphere is uniform, not Gaussian, and adapts LeJEPA's random-projection test to enforce it. Matches or beats LeJEPA, with a 1.8-point gain in ImageNet-1K linear probing (ViT-B/14).

[Paper](https://arxiv.org/abs/2605.26900)

}{cfyb paper: SPHERE-JEPA (2026) — a uniform sphere instead of a Gaussian}

{

Keeps VICReg's variance term but replaces its covariance term with a sliced-Wasserstein test of the full distribution, separating scale from shape. Pretrained on ImageNet-22K, it matches DINOv2 out of distribution with 10× less data.

[Paper](https://arxiv.org/abs/2606.02572)

}{cfyb paper: VISReg (2026) — VICReg's variance plus a full distribution test}

{

LeJEPA's recipe applied to video: one encoder, an invariance loss over global and local
views of a clip, and SIGReg against collapse. No EMA teacher, no stop-gradient, no pixel
reconstruction, one hyperparameter. Randomly dropping most tokens makes pretraining cheap
and even improves accuracy: it matches or beats V-JEPA 2 at 5.6 to 20.8× less compute, and
works with block-causal attention, so the encoder itself respects the order of time.

[Paper](https://arxiv.org/abs/2608.27395)

}{cfyb paper: LeVJEPA (2026) — V-JEPA without the heuristics, at a fraction of the compute}

{

One factorised JEPA design (orthogonal predictive factorization) tested across seven domains: vision, biology, clinical trajectories, control, molecular dynamics, physical fields and weather. It beats matched JEPA baselines on all 10 dynamics tasks.

[Paper](https://arxiv.org/abs/2609.20800)

}{cfyb paper: JEPA-Anything (2026) — one predictive design across seven domains}

### Planning with JEPA world models

Action-conditioned predictors used to plan, and the growing study of when they work.

{

Train only a predictor on top of frozen DINOv2 patch features and plan zero-shot with CEM. The baseline almost every later paper compares against.

[Paper](https://arxiv.org/abs/2411.04983)

}{cfyb paper: DINO-WM (2024) — a frozen DINOv2 encoder plus a predictor}

{

Learns encoder and predictor jointly from reward-free offline data and compares carefully with reinforcement learning. Staying stable takes seven loss terms.

[Paper](https://arxiv.org/abs/2502.14819)

}{cfyb paper: PLDM (2025) — end-to-end, held together by six loss weights}

{

Meta trains a future predictor in the latent space of a frozen DINOv2 on a large uncurated video dataset. It forecasts segmentation and depth, shows an understanding of intuitive physics, and after fine-tuning on actions it plans by simulating candidate trajectories.

[Paper](https://arxiv.org/abs/2507.19468)

}{cfyb paper: DINO-world (2025) — a video world model in DINOv2 space}

{

A large study of architecture, training objective and planning algorithm on simulated and real robot tasks. The resulting recipe beats DINO-WM and V-JEPA 2-AC.

[Paper](https://arxiv.org/abs/2512.24497)

}{cfyb paper: What drives success in JEPA world models? (2025) — the big ablation}

{

A lightweight open-source library covering image, video and action-conditioned JEPAs, each trainable on a single GPU in hours.

[Paper](https://arxiv.org/abs/2602.03604)

}{cfyb paper: EB-JEPA (2026) — a small library to train JEPAs yourself}

{

Masks whole object latents instead of image patches, so each hidden object must be inferred from its interactions with the others. About 20% better counterfactual reasoning, and planning with 1% of the latent features of patch-based models at comparable performance.

[Paper](https://arxiv.org/abs/2602.11389)

}{cfyb paper: Causal-JEPA (2026) — mask objects, not patches}

{

A curvature regulariser makes latent trajectories locally straight, so Euclidean distance in latent space better tracks the true distance to the goal. Gradient-based planning becomes more stable and succeeds more often.

[Paper](https://arxiv.org/abs/2603.12231)

}{cfyb paper: Temporal Straightening (2026) — straight latent paths plan better}

{

A 15M-parameter world model trained on one GPU with two loss terms. Plans up to 48× faster than DINO-WM.

[Paper](https://arxiv.org/abs/2603.19312) · [My post](../leworldmodel/)

}{cfyb paper post: LeWorldModel (2026) — end-to-end from pixels with SIGReg}

{

A long-horizon model sets latent subgoals for a short-horizon one. Real pick-and-place goes from 0% with single-level planning to 70%.

[Paper](https://arxiv.org/abs/2604.03208)

}{cfyb paper: Hierarchical Planning with Latent World Models (2026) — long-horizon subgoals in a shared latent space}

{

Applies LeWorldModel's Gaussian constraint in many random subspaces instead of the full embedding space, a weaker prior for latents that lie on low-dimensional manifolds. Outperforms LeWM in four continuous-control environments.

[Paper](https://arxiv.org/abs/2605.09241)

}{cfyb paper: Sub-JEPA (2026) — Gaussian constraints in random subspaces}

{

Adds an action-free latent planner that predicts intermediate subgoals, splitting a long trajectory into short, tractable planning problems.

[Paper](https://arxiv.org/abs/2606.09311)

}{cfyb paper: FF-JEPA (2026) — long horizons without goal images}

{

Predicts the latent after each action prefix in parallel, so planning is faster and errors grow more slowly with the horizon.

[Paper](https://arxiv.org/abs/2606.26217)

}{cfyb paper: Fast LeWorldModel (2026) — many steps ahead in one pass}

{

A JEPA world model for real-time quadrotor control. A physics-inspired probe maps latents to interpretable states, and sampling-based optimal control runs on embedded hardware. Trained on simulated data, it transfers zero-shot to outdoor flight.

[Paper](https://arxiv.org/abs/2606.23444)

}{cfyb paper: SkyJEPA (2026) — flying a real quadrotor with a JEPA world model}

{

Introduces action-conditioned predictive consistency, a diagnostic that bounds how much a visual perturbation can change multi-step prediction error and planning cost.

[Paper](https://arxiv.org/abs/2608.12939)

}{cfyb paper: Diagnosing JEPA world models (2026) — how robust are predictions to visual change?}

{

Avoiding collapse is not enough: an object's pose can be decodable from the latent yet barely change latent distance. SCALE aligns latent distances with distances in task-relevant state during training, improving LeWorldModel's planning on manipulation and navigation.

[Paper](https://arxiv.org/abs/2608.16287)

}{cfyb paper: SCALE (2026) — latent distances that reflect the task}

{

Gets anti-collapse pressure from the data instead of a prescribed distribution: a training-only inverse-dynamics head must identify which action in the batch produced each transition, which a collapsed encoder cannot do. Matches SIGReg on average, and reaches 80% versus 58% on the multi-object OGBench Visual Scene task.

[Paper](https://arxiv.org/abs/2608.17542)

}{cfyb paper: No Gaussian Required (2026) — contrastive inverse dynamics against collapse}

{

Adds inverse dynamics and state alignment to an end-to-end JEPA world model, so the latents keep the information a robot controller needs.

[Paper](https://arxiv.org/abs/2609.03565)

}{cfyb paper: Physically grounded JEPA world models (2026) — inverse dynamics and state alignment}

{

Shows that a more accurate prediction does not always lead to a better choice of action, and learns which candidate futures actually succeed from executed outcomes.

[Paper](https://arxiv.org/abs/2609.24749)

}{cfyb paper: D-JEPA (2026) — align predictions with decisions}

{

Finds that learned latent subgoals are often physically unreachable, and instead retrieves real states from past experience, linked into a graph of routes to the goal. Up to 37.3 points more long-horizon success than the next best hierarchical method, and up to 10.9× faster.

[Paper](https://arxiv.org/abs/2609.31868)

}{cfyb paper: Metro-WM (2026) — subgoals taken from real experience}

{

Uses a SIGReg-regularised projector for end-to-end autonomous driving, reporting a 100× inference speedup over earlier world models.

[Paper](https://arxiv.org/abs/2609.34085)

}{cfyb paper: AD-E2E-JEPA (2026) — a JEPA world model for driving}

{

Shows that the isotropic Gaussian from SIGReg can rank outcomes differently from the task cost, and learns an anisotropic covariance instead, improving on LeWorldModel in all four environments. A direct answer to the question I raise in my [LeJEPA post](../lejepa/).

[Paper](https://arxiv.org/abs/2609.37441)

}{cfyb paper: AnisoWM (2026) — anisotropic latents plan better}

{

A world-action model built on a frozen V-JEPA 2.1 encoder: a future-latent predictor and a flow-matching action expert are learned together. With 0.6B trainable parameters it is competitive on LIBERO, LIBERO-Plus and RoboCasa-GR1, and V-JEPA latents beat the other visual backbones tested, especially under distribution shift.

[Paper](https://arxiv.org/abs/2609.37250)

}{cfyb paper: V-JEPA Policy (2026) — robot actions from V-JEPA latents}

{

Finds that world models on frozen encoders such as V-JEPA 2 guide actions well only when the goal is within or just beyond the imagined trajectory.

[Paper](https://arxiv.org/abs/2609.39235)

}{cfyb paper: The Planning Limits of Latent World Models (2026) — reliable only for nearby goals}

{

A single rendered frame carries no velocity, so a world model that predicts from one frame cannot know how fast things move: velocity probes on the released LeWorldModel weights sit at chance. TI-JEPA splits the latent into a pose code and a finite-difference motion code.

[Paper](https://arxiv.org/abs/2610.04585)

}{cfyb paper: Frozen in a Frame (2026) — the velocity blind spot}

{

The full H-JEPA from the 2022 blueprint, trained end to end: a hierarchy of
action-conditioned JEPAs where each level predicts farther ahead in its own latent space.
Planning runs top-down, each level's predictions becoming subgoals for the level below.
On Visual AntMaze, three levels raise success from 18% to 73% with less planner compute,
and the approach extends to real robot videos from DROID.

[Paper](https://arxiv.org/abs/2610.06805) · [My post](../h-jepa/)

}{cfyb paper post: H-JEPA (2026) — a hierarchy of JEPAs, each in its own latent space}

{

A stochastic JEPA for partially observed scenes. A flow-matching predictor proposes several possible futures, and their spread steers CEM planning toward exploring where an occluded goal may be. Up to 22% higher success than LeWorldModel.

[Paper](https://arxiv.org/abs/2610.05996)

}{cfyb paper: EpicWorldModel (2026) — explore when the goal is hidden}

{

Next-step prediction plus anti-collapse regularisation can still discard the unstable modes a controller must see. Adding an inverse-dynamics loss provably keeps every state direction reachable within H steps. Theory for linear systems, experiments on CartPole, Walker2D and PointMaze.

[Paper](https://arxiv.org/abs/2610.07540)

}{cfyb paper: Preserving Unstable Modes (2026) — inverse dynamics for control-aware latents}

{

An 8B-parameter JEPA predictor, the largest so far, trained on real data from 12 robot embodiments. Imagination error follows a power law in compute and predicts planning success, and the model plans zero-shot toward a goal image on real hardware. Checkpoints and code are released.

[Paper](https://arxiv.org/abs/2610.10515)

}{cfyb paper: RoboJEPA (2026) — scaling laws for robot world models}

{

One end-to-end JEPA that predicts the next latent and generates actions with flow matching, with an isotropic Gaussian constraint on the latent. It can act directly or plan. Against prior JEPAs, success rises from 28.6% to 89.7% on contact-rich tasks and from 10.9% to 46.2% on long-horizon tasks, with planning 32.3× faster.

[Paper](https://arxiv.org/abs/2610.12818)

}{cfyb paper: LeWAM (2026) — world model and policy in one JEPA}

{

Across 15 checkpoints of an end-to-end JEPA world model, one-step prediction error kept improving while planning success did not (correlation r = -0.010). One-step loss is a poor criterion for choosing or ablating world models.

[Paper](https://arxiv.org/abs/2610.19375)

}{cfyb paper: One-step fidelity is a poor proxy (2026) — better prediction, same planning}

### Beyond vision

The same idea applied to sound, graphs, point clouds, brains, language, people and molecules.

{

Applies masked latent prediction to audio spectrograms, with a curriculum that respects time-frequency structure.

[Paper](https://arxiv.org/abs/2311.15830)

}{cfyb paper: A-JEPA (2023) — a JEPA for audio}

{

Predicts the representations of masked subgraphs, using hyperbolic coordinates to capture hierarchy.

[Paper](https://arxiv.org/abs/2309.16014)

}{cfyb paper: Graph-JEPA (2023) — a JEPA for graphs}

{

Orders point-cloud patches with a sequencer so that context and targets can be chosen efficiently, with no reconstruction.

[Paper](https://arxiv.org/abs/2404.16432)

}{cfyb paper: Point-JEPA (2024) — a JEPA for point clouds}

{

A JEPA trained on fMRI, with new positional encodings and spatiotemporal masking. NeurIPS 2024 spotlight.

[Paper](https://arxiv.org/abs/2409.19407)

}{cfyb paper: Brain-JEPA (2024) — a foundation model of brain dynamics}

{

Adds an embedding-space objective to LLM training and outperforms the standard objective across several model families.

[Paper](https://arxiv.org/abs/2509.14252)

}{cfyb paper: LLM-JEPA (2025) — a JEPA objective for language models}

{

A vision-language model that predicts the embedding of its answer and decodes text only when needed, beating a token-based model with half the trainable parameters.

[Paper](https://arxiv.org/abs/2512.10942)

}{cfyb paper: VL-JEPA (2025) — predict embeddings instead of tokens}

{

Proposes that token sequences follow smooth paths in a semantic space, and uses a JEPA objective to match baseline accuracy with 16× less training data.

[Paper](https://arxiv.org/abs/2602.22617)

}{cfyb paper: Semantic Tube Prediction (2026) — LLMs with 16× less data}

{

LeJEPA extended to audio and video: one early-fusion ViT, modality dropout as masking, and SIGReg, with no decoder, EMA teacher or negatives. Reaches 57.1% top-1 on VGGSound and supports zero-shot audio-video retrieval.

[Paper](https://arxiv.org/abs/2607.15295)

}{cfyb paper: AV-JEPA (2026) — LeJEPA for sound and video together}

{

A video model that both perceives human behaviour and forecasts what comes next, competitive on pose estimation and re-identification with fewer parameters.

[Paper](https://arxiv.org/abs/2608.21160)

}{cfyb paper: Human-JEPA (2026) — perceive and anticipate people}

{

Masks whole modalities of a molecule (structure, cell response, binding, toxicity) and predicts them from the rest, with SIGReg against modality collapse.

[Paper](https://arxiv.org/abs/2608.22642)

}{cfyb paper: Mol-JEPA (2026) — a world model for molecules}

## Do they understand physics?

Benchmarks and studies that test whether a world model has learned how the physical world behaves.

{

Adapts a test from developmental psychology: show possible and impossible videos (objects vanishing, changing shape, teleporting) and check which ones surprise the model.

[Paper](https://arxiv.org/abs/1803.07616)

}{cfyb paper: IntPhys (2018) — a violation-of-expectation benchmark}

{

V-JEPA reaches 98% on IntPhys, while pixel-prediction models and video LLMs stay near chance, but it does not yet understand collisions or solidity.

[Paper](https://arxiv.org/abs/2502.11831)

}{cfyb paper: Intuitive physics from video pretraining (2025) — V-JEPA is surprised by the impossible}

{

Tests generative video models on fluids, optics, solid mechanics and more, and finds their physical understanding very limited despite realistic output.

[Paper](https://arxiv.org/abs/2501.09038)

}{cfyb paper: Physics-IQ (2025) — realistic video is not physical understanding}

{

Meta's follow-up to IntPhys: violation-of-expectation tests of permanence, immutability, spatio-temporal continuity and solidity in complex virtual scenes. Most models stay near chance (50%), while humans are near perfect.

[Paper](https://arxiv.org/abs/2506.09849)

}{cfyb paper: IntPhys 2 (2025) — intuitive physics in complex scenes}

{

An action-conditioned video shell game. Models render plausible swaps but fail on longer swap chains than they were trained on, because a causal Transformer's KV cache cannot revise its hidden state. Linear attention with negative eigenvalues, or test-time-training fast weights, can learn the rule.

[Paper](https://arxiv.org/abs/2608.30692)

}{cfyb paper: Can Video World Models Track Unobserved World States? (2026) — the shell game}

{

Hides objects from a frozen V-JEPA 2 predictor. The encoder still knows the object is there, but the predictor loses a moving object within 0.3 s. Brief predictor-only training on synthetic containers installs object permanence.

[Paper](https://arxiv.org/abs/2610.07355)

}{cfyb paper: Tracking Is Not Permanence (2026) — what V-JEPA 2 keeps of a hidden object}

{

40 tasks across mechanics, optics, fluids, thermal effects, electromagnetism and surface tension, scored by physical measurements rather than by a judge model. The best of eight video models scores 57.76 out of 100.

[Paper](https://arxiv.org/abs/2610.08791)

}{cfyb paper: World Models' Last Exam in Physics (2026) — measured, not judged}

## Theory

Why these methods work, and when.

{

My running history of the fixes for collapse, from contrastive losses to SIGReg.

[My post](../avoiding-collapse/)

}{cfyb paper post: Avoiding collapse (2026) — how methods keep embeddings from collapsing}

{

Shows, in deep linear models, that JEPA-style training is biased toward highly predictive features and away from noisy pixel detail, unlike reconstruction.

[Paper](https://arxiv.org/abs/2407.03475)

}{cfyb paper: How JEPA Avoids Noisy Features (2024) — the implicit bias of predicting in latent space}

{

Derives the pull toward isotropic Gaussian embeddings from the information bottleneck principle, recast as a rate-distortion problem, which gives a theoretical reason for regularisers such as SIGReg.

[Paper](https://arxiv.org/abs/2604.27743)

}{cfyb paper: Why Self-Supervised Encoders Want to Be Normal (2026) — the Gaussian from the information bottleneck}

{

Proves that LeJEPA recovers the world's latent variables up to a rotation under stationary, additive-noise dynamics, and that the Gaussian is the only latent distribution for which this works.

[Paper](https://arxiv.org/abs/2605.26379)

}{cfyb paper: When Does LeJEPA Learn a World Model? (2026) — recovering the true latents}

{

On data generated by a hierarchical grammar, proves that predicting one's own latents needs a number of samples constant in the depth of the hierarchy, while token-level prediction needs exponentially many. It also suggests that explicit stacking, as in H-JEPA, is largely redundant.

[Paper](https://arxiv.org/abs/2605.27734)

}{cfyb paper: Learn from Your Own Latents (2026) — the sample complexity of latent prediction}

{

Links pretraining error to planning performance and finds a trade-off in the latent dimension: larger latents approximate better but need more data.

[Paper](https://arxiv.org/abs/2606.27014)

}{cfyb paper: A Generalization Theory for JEPA-Based World Models (2026) — latent size versus data}

{

Places VICReg, LogDet, PairDist and SIGReg in one hierarchy of entropy estimators, and shows that with SIGReg the JEPA objective becomes an exact active-inference free energy. Theory only, with the core algebra machine-checked in Lean 4.

[Paper](https://arxiv.org/abs/2607.13612)

}{cfyb paper: SIGReg as Variational Free Energy (2026) — an active-inference reading of JEPA}

{

Extends identifiability to action-conditioned world models: under stated conditions on the latents and the actions, a LeJEPA-style objective recovers both the latent states and the controlled dynamics up to an orthogonal transformation.

[Paper](https://arxiv.org/abs/2607.22430)

}{cfyb paper: On the Identifiability of Controlled World Models (2026) — recovering states and dynamics}

{

Shows that the Gaussian is not the only answer when latents live on curved spaces. On a sphere, matching a uniform spherical target also recovers the latent state up to an orthogonal transformation, with a tighter approximate-recovery bound than in the Gaussian case.

[Paper](https://arxiv.org/abs/2609.21656)

}{cfyb paper: Beyond Gaussian Worlds (2026) — latent geometry matters}

{

Linearises JEPA training around the collapsed solution and finds, for each mode, a driving force and a decay effect whose ratio decides whether the mode escapes collapse. Predictor size, masking ratio and EMA become three ways to shift that ratio, confirmed on over 800 configurations.

[Paper](https://arxiv.org/abs/2610.02344)

}{cfyb paper: Drive vs. Decay (2026) — the training dynamics behind collapse}

{

Goes beyond LeJEPA's recovery up to a linear map. Under a condition called Structural Diversity, a post-hoc regulariser recovers each individual world latent, up to sign and order, with no decoder or labels.

[Paper](https://arxiv.org/abs/2610.09457)

}{cfyb paper: DSReg (2026) — recovering individual world latents}

## Surveys and tools

Wider overviews of the field, and software for running world-model experiments yourself.

{

Reviews how world models are used in robot learning: inside policies, as learned simulators for reinforcement learning, and through video generation for navigation and driving.

[Paper](https://arxiv.org/abs/2605.00080)

}{cfyb paper: World Model for Robot Learning (2026) — a survey of world models in robotics}

{

An open-source platform for world-model research, built on PyTorch and Gymnasium: a
fast data layer with converters for common robot-dataset formats, clean implementations
of baselines such as DINO-WM, PLDM, TD-MPC2 and LeWorldModel, and environments whose
visual, geometric and physical factors can be varied for evaluation. The goal is to
shorten the path from an idea to a fair, reproducible experiment.

[Paper](https://arxiv.org/abs/2605.21800) · [Code](https://github.com/galilai-group/stable-worldmodel) · [My post](../stable-worldmodel/)

}{cfyb paper post: stable-worldmodel (2026) — a platform for reproducible world-model research}

{

A short tutorial rather than a survey: what counts as a world, how world models and world action models differ, and how World Labs' models, JEPA and Cosmos compare in what they represent and predict.

[Paper](https://arxiv.org/abs/2607.00836)

}{cfyb paper: From World Models to World Action Models (2026) — a concise tutorial for robotics}

{

A perspective paper that proposes a scientific definition of world models, discusses their key technical aspects, and lays out a staged roadmap for building them.

[Paper](https://arxiv.org/abs/2607.06401)

}{cfyb paper: A Definition and Roadmap for World Models (2026) — what a world model is}

{

A reproducible baseline for training streaming video world models from scratch: a block-causal diffusion transformer with diffusion forcing, trainable in a few days on one 8-GPU server, with code and checkpoints released.

[Paper](https://arxiv.org/abs/2608.01127)

}{cfyb paper: MiniWorld (2026) — train a video world model from scratch}

## Who is building what

| Lab | World-model work | Approach |
| --- | --- | --- |
| Meta FAIR | I-JEPA, V-JEPA, V-JEPA 2 and 2.1, DINOv2 and DINOv3, DINO-world | Joint-embedding |
| AMI Labs | Founded by Yann LeCun; $1.03B seed in 2026 to build JEPA-based world models | Joint-embedding |
| Google DeepMind | Genie 1–3, Dreamer 4, MuZero | Generative worlds, model-based RL |
| NVIDIA | Cosmos, Cosmos-Predict2.5, Cosmos 3 | Generative worlds |
| OpenAI | Sora | Generative video |
| World Labs | Marble (2025), editable 3D worlds from text, images or video; Atlas (2026). Agreed in September 2026 to join AMD | Generative 3D worlds |
| Wayve | GAIA-1, GAIA-2 | Generative, for driving |
| Waymo | Waymo World Model, built on Genie 3 | Generative, for driving |

## Where to start

- [World Models](https://arxiv.org/abs/1803.10122) for the idea in its simplest form.
- [DreamerV3](https://arxiv.org/abs/2301.04104) for model-based RL that works across domains.
- [Genie 3](https://deepmind.google/discover/blog/genie-3-a-new-frontier-for-world-models/) for where generative worlds stand.
- [LeWorldModel](../leworldmodel/) for a JEPA world model you can train on one GPU.
