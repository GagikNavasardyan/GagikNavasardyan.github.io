---
title: "stable-worldmodel: A Platform for Reproducible World Modeling Research and Evaluation"
date: 2026-10-06
paper: 2026-05-20
tags: [world-models, planning, benchmark]
summary: A practical guide to stable-worldmodel, the shared platform for training and evaluating world models, with each main environment's task, observations, actions and success criterion.
---

[stable-worldmodel](https://arxiv.org/abs/2605.21800) is an open-source platform for
world-model research: one library to collect data, train a world model, and evaluate it
by planning, across about 150 environments, over 100 of which are Atari games. Its main
idea is **factors of variation**: colours, lighting, shapes, masses and dynamics that can
be changed one at a time. They make it possible to study a world model under controlled changes: how well it
generalises, how robust it is, or how it copes when the environment shifts over time.

<figure>
  <img src="../../assets/posts/stable-worldmodel/environment-families.png" alt="Five groups of environment thumbnails: (a) classic control, such as Push-T, CartPole, MountainCar and Two-Room; (b) MuJoCo bodies such as the humanoid, cheetah and walker; (c) Atari arcade games; (d) robotics, with OGBench robot arms and Fetch; (e) the open-world game Craftax. The top row shows the default look of each environment, the bottom row the same environments with their visual factors of variation changed: colours, textures and occluding squares." width="2177" height="974" loading="lazy" decoding="async">
  <figcaption>Environment families supported by swm. Figure from <a href="https://arxiv.org/abs/2605.21800">stable-worldmodel</a> (2026).</figcaption>
</figure>

This post is a practical reference for anyone looking for a benchmark to test a new world
model. It covers the main environment families: what each task is, what the model sees
and does, and what counts as success.

## How it works

<figure>
  <img src="../../assets/posts/stable-worldmodel/swm.png" alt="The stable-worldmodel loop. A World of about 150 environments is used to collect a dataset in Lance, HDF5, MP4 or LeRobot format; the dataset trains a world model from the provided baselines (DINO-WM, IVL, IQL, LeWM, GCBC, PLDM); a solver (CEM, iCEM, MPPI, PS, GD, Adam) sends actions to the world model, which assigns them a cost, and the chosen action goes back to the World." width="875" height="740" loading="lazy" decoding="async">
  <figcaption>Overview of stable-worldmodel. Figure from <a href="https://arxiv.org/abs/2605.21800">stable-worldmodel</a> (2026).</figcaption>
</figure>

The figure shows the full loop:

1. **Collect.** A **World** wraps an environment, runs many copies in parallel and
   records trajectories into a **dataset** (Lance, HDF5, MP4 or LeRobot).
2. **Train.** The dataset trains a **world model**: your own, or one of the provided
   baselines (DINO-WM, LeWM, PLDM, and the goal-conditioned methods GCBC, IQL and IVL).
3. **Plan.** At test time a **solver** proposes actions, the world model assigns each a
   cost, and the solver refines them. The chosen action goes to the World, which sends
   back new information, and the loop repeats.

To get started: a minimal example, the data formats, the ready-made baselines, and the
solvers that do the planning.

{

```bash
pip install 'stable-worldmodel[all]'   # training, environments and data
```

> **Note:** this differs slightly from the quickstart in their
> [GitHub README](https://github.com/galilai-group/stable-worldmodel). I ran it and fixed two
> issues: `World` needs an `image_shape`, and `collect` and `load_dataset` resolve relative
> paths differently, so both now use the same absolute path.

```python
from pathlib import Path
import stable_worldmodel as swm
from stable_worldmodel.policy import WorldModelPolicy, PlanConfig
from stable_worldmodel.planning import CEMSolver

# 1. Collect a dataset with any policy
world = swm.World("swm/PushT-v1", num_envs=8, image_shape=(224, 224))
world.set_policy(your_expert_policy)
path = Path("data/pusht_demo.lance").absolute()
world.collect(path, episodes=100, seed=0)

# 2. Load it for training: windows of 16 consecutive steps
dataset = swm.data.load_dataset(path, num_steps=16)
world_model = ...  # your model

# 3. Evaluate by planning with model-predictive control
solver = CEMSolver(cost=world_model, num_samples=300)
policy = WorldModelPolicy(
    solver=solver,
    config=PlanConfig(horizon=10, receding_horizon=5),
)
world.set_policy(policy)
results = world.evaluate(episodes=50)
print(f"Success Rate: {results['success_rate']:.1f}%")
```

}{cfyb code: Quickstart — install, collect, train, plan}

{

| Format | Stored as | Best for |
| --- | --- | --- |
| `lance` (default) | a LanceDB table | fast indexed reads, appending; about 4,800 samples/s locally |
| `hdf5` | one `.h5` file | a single portable file |
| `folder` | `.npz` columns and one JPEG per step | inspecting data by hand |
| `video` | `.npz` columns and one MP4 per episode | long episodes, compact storage |
| `lance_video` | a LanceDB table with one MP4 per episode | Lance's fast reads, video's compact storage |
| `lerobot` | `lerobot://<repo_id>` | reading LeRobot Hub datasets |

Convert between them with `swm.data.convert(...)`.

}{cfyb code: Data formats — Lance, HDF5, folders, video, LeRobot}

{

Ready-made baselines, so new models can be compared on equal terms:

- **Latent world models:** DINO-WM, PLDM, LeWorldModel, TD-MPC2.
- **Goal-conditioned RL:** behaviour cloning (GCBC), implicit Q-learning (GCIQL) and
  implicit V-learning (GCIVL).

}{cfyb code: Baselines — world models and goal-conditioned RL}

{

A solver searches for the action sequence whose predicted outcome, under the world model,
has the lowest cost, for example the distance to a goal image. There are two families.

**Sampling-based**: try many random action sequences, score them all with the world
model, and use the best ones to guide the next round. No gradients are needed.

- **CEM** (cross-entropy method), the default in the quickstart and the one LeWM and
  DINO-WM use: sample action sequences from a Gaussian, keep the best few, fit a new
  Gaussian to them, and repeat.
- **MPPI**: instead of keeping only the best few, average all the samples, weighting each
  one by how low its cost is. PLDM uses it.
- **iCEM** and **predictive sampling** are variants of these; a **categorical CEM**
  handles discrete actions.

**Gradient-based**: start from one action sequence and improve it by following the
gradient of the cost back through the world model (plain gradient descent, a projected
version that keeps actions in range, or Adam). This needs a differentiable world model
and can get stuck in a local minimum. A **Lagrangian** solver adds constraints on top.

In code, planning is wrapped in a **policy**: `WorldModelPolicy` combines a solver and a
world model, so a trained model is evaluated in the World like any other policy. Whatever
the solver, the policy executes the first few planned actions, then plans again from the
new observation: model-predictive control.

}{cfyb code: Solvers — how the planner picks actions}

## The environments

Here are the main benchmarks in the library. For each one there is a description of the
task, what the model **observes**, how it **acts**, what counts as reaching the **goal**,
and which factors can be varied.

{

A round agent pushes a T-shaped block until it matches a target position and orientation.
The agent can only push, so it has to work around the block, using contact to both move
and rotate it. 2D rigid-body physics (Pymunk), control at 10 Hz.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">224 × 224 RGB</span></span></div><div class="io-row"><span class="io-key">Proprio</span><span class="io-val"><span class="io-item">agent position (x, y)</span><span class="io-item">agent velocity (vx, vy)</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">agent position (x, y)</span><span class="io-item">block position (x, y)</span><span class="io-item">block angle (θ)</span><span class="io-item">agent velocity (vx, vy)</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">agent move (ax, ay)</span><span class="io-item">each between −1 and 1</span><span class="io-item">discrete version: one of 16 distances × 16 directions</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">an image of the target pose</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">block within 20 px and 20° of the target</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/PushT-v1</code></span><span class="io-item"><code>swm/PushT-Discrete-v1</code> (discrete actions)</span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Agent</strong>: colour, size, shape (8 shapes), angle, start position, velocity</span><span class="io-item"><strong>Block</strong>: colour, size, shape, angle, start position</span><span class="io-item"><strong>Goal</strong>: colour, size, angle, position</span><span class="io-item"><strong>Background</strong>: colour</span><span class="io-item"><strong>Rendering</strong>: goal shown or hidden</span><span class="io-item io-total">17 factors in total</span></span></div></div>

<figure>
  <img src="../../assets/posts/stable-worldmodel/pusht.gif" alt="An animation of Push-T: a blue round agent pushes a grey T-shaped block until it lines up with the green target T." width="224" height="224" loading="lazy" decoding="async">
  <figcaption>Push-T: pushing the T onto its target. Animation from the <a href="https://github.com/galilai-group/stable-worldmodel">swm docs</a>.</figcaption>
</figure>

}{cfyb paper: Push-T — push a T-block into a target pose}

{

A point agent must reach a target in the other room. The two rooms are separated by a
wall with one to three doors, so the agent has to find a door and plan its route through
it. 2D movement, with collisions against the walls only.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">224 × 224 RGB</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">agent position (x, y)</span><span class="io-item">target position (x, y)</span><span class="io-item">door centres (x, y), up to 3</span><span class="io-item">all in pixels, 0 to 224</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">move direction (ax, ay)</span><span class="io-item">each between −1 and 1</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">the target position</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">agent within 16 px of the target</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/TwoRoom-v1</code></span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Agent</strong>: colour, size, position, speed</span><span class="io-item"><strong>Target</strong>: colour, size, position</span><span class="io-item"><strong>Wall</strong>: colour, border colour, thickness, orientation</span><span class="io-item"><strong>Doors</strong>: number (1 to 3), colour, size, position</span><span class="io-item"><strong>Background</strong>: colour</span><span class="io-item"><strong>Task</strong>: minimum episode length</span><span class="io-item io-total">17 factors in total</span></span></div></div>

<figure>
  <img src="../../assets/posts/stable-worldmodel/tworoom.gif" alt="An animation of Two-Room: a red agent moves from one room, through the gap in the dividing wall, to a green target in the other room." width="224" height="224" loading="lazy" decoding="async">
  <figcaption>Two-Room: reaching the target through the door. Animation from the <a href="https://github.com/galilai-group/stable-worldmodel">swm docs</a>.</figcaption>
</figure>

}{cfyb paper: Two-Room — navigate through a door to the other room}

{

A point agent must reach a target in a single open room, bounded only by its outer walls.
The room is split into a grid of zones (2 × 2 by default), and each zone has its own
fixed push. So the same action can move the agent faster, slower or off to the side,
depending on the zone it is in, and the world model has to learn dynamics that change
with position. The push is a 2D offset of up to 4 px per step along each axis, added to
every move the agent makes inside the zone.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">224 × 224 RGB</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">agent position (x, y)</span><span class="io-item">target position (x, y)</span><span class="io-item">all in pixels, 0 to 224</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">move direction (ax, ay)</span><span class="io-item">each between −1 and 1</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">the target position</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">agent within 16 px of the target</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/Piecewise-v0</code></span><span class="io-item"><code>grid_n</code>: zones per side (default 2)</span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Agent</strong>: colour, size, position, speed</span><span class="io-item"><strong>Target</strong>: colour, size, position</span><span class="io-item"><strong>Room</strong>: background colour, border colour</span><span class="io-item"><strong>Zones</strong>: each zone's push and colour</span><span class="io-item"><strong>Task</strong>: minimum episode length</span><span class="io-item"><strong>Rendering</strong>: target, zone colours and push arrows shown or hidden</span><span class="io-item io-total">21 factors in total, with 2 × 2 zones</span></span></div></div>

<figure>
  <img src="../../assets/posts/stable-worldmodel/piecewise.gif" alt="An animation of Piecewise: a room split into four pastel-coloured zones, where a red agent moves across the zones to a green target, three times from different starting points." width="224" height="224" loading="lazy" decoding="async">
  <figcaption>Piecewise: reaching the target across zones. Recorded with <a href="https://github.com/galilai-group/stable-worldmodel">swm</a>.</figcaption>
</figure>

}{cfyb paper: Piecewise — reach a target in a room whose zones push the agent}

{

A robot arm picks, places, swaps and stacks cubes to reach a target arrangement. Comes
in five sizes, from 1 to 8 cubes, each with five evaluation tasks of growing difficulty.
A standard 3D manipulation test for world models.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">224 × 224 RGB</span><span class="io-item">optional multi-view</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">arm joint angles<br>(q₁ … q₆)</span><span class="io-item">arm joint velocities<br>(q̇₁ … q̇₆)</span><span class="io-item">end-effector position<br>(x, y, z)</span><span class="io-item">end-effector yaw<br>(cos ψ, sin ψ)</span><span class="io-item">gripper opening</span><span class="io-item">gripper contact</span><span class="io-item">for each cube:</span><span class="io-item io-sub">position (x, y, z)</span><span class="io-item io-sub">rotation (quaternion)</span><span class="io-item io-sub">yaw (cos, sin)</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">end-effector move<br>(dx, dy, dz)</span><span class="io-item">yaw change (dψ)</span><span class="io-item">gripper open/close (g)</span><span class="io-item">each between −1 and 1</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">a target position<br>for each cube</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">every cube within 4 cm<br>of its target</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/OGBCube-v0</code></span><span class="io-item"><code>env_type</code>: single, double, triple, quadruple or octuple</span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Cube</strong>: colour, size, start pose, goal pose</span><span class="io-item"><strong>Arm</strong>: colour, start position</span><span class="io-item"><strong>Floor</strong>: colours</span><span class="io-item"><strong>Camera</strong>: angle</span><span class="io-item"><strong>Light</strong>: intensity</span><span class="io-item io-total">11 factors in total</span></span></div></div>

<figure>
  <img src="../../assets/posts/stable-worldmodel/ogb-cube.gif" alt="An animation of OGBench Cube: a robot arm picks up a red cube and places it at a new spot on the table." width="224" height="224" loading="lazy" decoding="async">
  <figcaption>OGBench Cube: picking and placing a cube. Animation from the <a href="https://github.com/galilai-group/stable-worldmodel">swm docs</a>.</figcaption>
</figure>

}{cfyb paper: OGBench Cube — 5 versions, 1 to 8 cubes moved to target poses by a robot arm}

{

A robot arm works in a scene with a cube, a drawer, a window, and two buttons that lock
and unlock the drawer and the window. Tasks need several steps in the right order, such as
unlocking the drawer before opening it. Five tasks: open, unlock and lock, rearrange
(medium), put the cube in the drawer, rearrange (hard).

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">224 × 224 RGB</span><span class="io-item">front or side camera</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">arm joint angles<br>(q₁ … q₆)</span><span class="io-item">arm joint velocities<br>(q̇₁ … q̇₆)</span><span class="io-item">end-effector position<br>(x, y, z)</span><span class="io-item">end-effector yaw<br>(cos ψ, sin ψ)</span><span class="io-item">gripper opening</span><span class="io-item">gripper contact</span><span class="io-item">cube position,<br>rotation and yaw</span><span class="io-item">2 button states<br>(locked or not)</span><span class="io-item">drawer position<br>and velocity</span><span class="io-item">window position<br>and velocity</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">end-effector move<br>(dx, dy, dz)</span><span class="io-item">yaw change (dψ)</span><span class="io-item">gripper open/close (g)</span><span class="io-item">each between −1 and 1</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">target states<br>of all objects</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">cube, drawer and window<br>within 0.04 of targets</span><span class="io-item">both buttons in their<br>target state</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/OGBScene-v0</code></span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Cube</strong>: colour, size, start pose, goal pose</span><span class="io-item"><strong>Locks</strong>: colour</span><span class="io-item"><strong>Arm</strong>: colour, start position</span><span class="io-item"><strong>Floor</strong>: colours</span><span class="io-item"><strong>Camera</strong>: angle</span><span class="io-item"><strong>Light</strong>: intensity</span><span class="io-item io-total">12 factors in total</span></span></div></div>

<figure>
  <img src="../../assets/posts/stable-worldmodel/ogb-scene.gif" alt="An animation of OGBench Scene: a robot arm picks up a red cube and puts it into the open drawer, next to a window and two buttons." width="224" height="224" loading="lazy" decoding="async">
  <figcaption>OGBench Scene: putting the cube in the drawer. Animation from the <a href="https://github.com/galilai-group/stable-worldmodel">swm docs</a>.</figcaption>
</figure>

}{cfyb paper: OGBench Scene — drawer, window, locks and a cube}

{

Locomotion through mazes of different layouts (arena, medium, large, giant, teleport),
with a choice of body: a point mass, an ant, or a humanoid. A variant asks the agent to
push a ball to the goal instead.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">224 × 224 RGB</span><span class="io-item">states by default</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">point mass:<br>force (ax, ay)</span><span class="io-item">ant: 8 joint torques</span><span class="io-item">humanoid:<br>21 joint torques</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">a target location<br>(x, y) in the maze</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">within 1.0 (point)<br>or 0.5 (ant, humanoid)<br>of the goal</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/OGBMaze-v0</code></span><span class="io-item"><code>maze_type</code>: arena, medium, large, giant or teleport</span><span class="io-item"><code>loco_env_type</code>: point, ant or humanoid</span><span class="io-item"><code>maze_env_type</code>: maze (navigate) or ball (push a ball to the goal)</span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Agent</strong>: colour</span><span class="io-item"><strong>Walls</strong>: colour</span><span class="io-item"><strong>Floor</strong>: checker colours, position gradient on or off</span><span class="io-item"><strong>Light</strong>: intensity</span><span class="io-item io-total">5 factors in total</span></span></div></div>

}{cfyb paper: OGBench Maze — 5 maze layouts, navigated as a point, an ant or a humanoid}

{

The standard MuJoCo control suite, rendered from pixels. Each body comes with its own
set of tasks: running, hopping, balancing, reaching… Actions are repeated for 2 simulation steps.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">224 × 224 RGB</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">joint positions<br>and velocities</span><span class="io-item">task-specific readings</span><span class="io-item">flattened into<br>one vector</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">one torque per<br>actuated joint</span><span class="io-item">each between −1 and 1</span><span class="io-item">count per body below</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">the task's own<br>objective</span><span class="io-item">run, hop, balance,<br>reach…</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/&lt;Body&gt;DMControl-v0</code></span><span class="io-item">for example <code>swm/CheetahDMControl-v0</code></span><span class="io-item"><code>task</code>: several per body (hopper: stand, hop, flip, and their backward versions)</span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Visual</strong>: body and floor colours, lighting</span><span class="io-item"><strong>Physical</strong>: body densities, locked joints, friction, gravity</span><span class="io-item io-total">6 to 10 factors in total, depending on the body</span></span></div></div>

| Body | Torques |
| --- | --- |
| Cartpole, Pendulum, Acrobot | 1 |
| Reacher, Ball in cup, Finger | 2 |
| Hopper | 4 |
| Manipulator | 5 |
| Cheetah, Walker | 6 |
| Quadruped | 12 |
| Humanoid | 21 |

<figure>
  <img src="../../assets/posts/stable-worldmodel/dmc.webp" alt="A three by three grid of animated DeepMind Control bodies: cheetah running, walker, hopper, quadruped, reacher arm, finger spinning a body, ball in cup, cartpole and pendulum." width="516" height="516" loading="lazy" decoding="async">
  <figcaption>Nine of the DeepMind Control bodies. Animation from the <a href="https://github.com/galilai-group/stable-worldmodel">swm docs</a>.</figcaption>
</figure>

}{cfyb paper: DeepMind Control — 12 classic continuous-control bodies}

{

Five small control problems, each rendered as an image and extended with factors of
variation.

{

A pole is hinged on a cart that moves along a track. By pushing the cart left or right, the agent keeps the pole upright.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">600 × 400 RGB render</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">cart position</span><span class="io-item">cart velocity</span><span class="io-item">pole angle</span><span class="io-item">pole angular velocity</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">discrete</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">push left or right</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">keep the pole upright</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">pole within 12°<br>of upright</span><span class="io-item">cart within 2.4<br>of the centre</span><span class="io-item">for up to 500 steps</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/CartPoleControl-v1</code></span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Physics</strong>: gravity, cart mass, pole mass, pole length, push force, time step</span><span class="io-item"><strong>Colours</strong>: background, cart, pole, axle</span><span class="io-item io-total">10 factors in total</span></span></div></div>

<figure class="fig-small">
  <img src="../../assets/posts/stable-worldmodel/classic-cartpole.png" alt="The CartPole environment: a tan pole hinged on a black cart standing on a track." width="248" height="248" loading="lazy" decoding="async">
  <figcaption>CartPole: the pole on its cart. Rendered with <a href="https://github.com/galilai-group/stable-worldmodel">swm</a>.</figcaption>
</figure>

}{cfyb row: CartPole — keep a pole upright on a moving cart}

{

A car sits in a valley between two hills, and its engine is too weak to drive straight up. It has to rock back and forth to build momentum and reach the flag on the right hill.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">600 × 400 RGB render</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">car position</span><span class="io-item">car velocity</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">discrete or continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">discrete: push left,<br>none or right</span><span class="io-item">continuous: force<br>between −1 and 1</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">reach the flag</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">car position ≥ 0.5<br>(0.45 continuous)</span><span class="io-item">within 200 steps<br>(999 continuous)</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/MountainCarControl-v0</code> (discrete)</span><span class="io-item"><code>swm/MountainCarContinuousControl-v0</code> (continuous)</span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Physics</strong>: gravity, push force and maximum speed (discrete); engine power and maximum speed (continuous)</span><span class="io-item"><strong>Colours</strong>: background, foreground</span><span class="io-item io-total">5 factors in total (discrete), 4 (continuous)</span></span></div></div>

<figure class="fig-small">
  <img src="../../assets/posts/stable-worldmodel/classic-mountaincar.png" alt="The MountainCar environment: a small car at the bottom of a valley between two hills, with a yellow flag on top of the right hill." width="248" height="248" loading="lazy" decoding="async">
  <figcaption>MountainCar: the car in the valley, the flag on the right. Rendered with <a href="https://github.com/galilai-group/stable-worldmodel">swm</a>.</figcaption>
</figure>

}{cfyb row: MountainCar — rock a car up a hill to the flag}

{

Two links hang from a fixed pivot, and only the joint between them is driven. The agent swings the arm until its tip rises above a line.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">500 × 500 RGB render</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">cos and sin of<br>both joint angles</span><span class="io-item">both joint velocities</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">discrete</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">torque −1, 0 or +1<br>on the middle joint</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">raise the tip<br>above the line</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">tip above the line</span><span class="io-item">within 500 steps</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/AcrobotControl-v1</code></span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Physics</strong>: link lengths, link masses, centres of mass, moment of inertia</span><span class="io-item"><strong>Colours</strong>: background, line, links, joints</span><span class="io-item io-total">11 factors in total</span></span></div></div>

<figure class="fig-small">
  <img src="../../assets/posts/stable-worldmodel/classic-acrobot.png" alt="The Acrobot environment: a two-link cyan arm hanging from a pivot, with a horizontal line above it." width="248" height="248" loading="lazy" decoding="async">
  <figcaption>Acrobot: the two-link arm below the line. Rendered with <a href="https://github.com/galilai-group/stable-worldmodel">swm</a>.</figcaption>
</figure>

}{cfyb row: Acrobot — swing a two-link arm above a line}

{

A pendulum hangs from a pivot. The agent applies torque to swing it up and keep it balanced upright.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">500 × 500 RGB render</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">cos θ, sin θ</span><span class="io-item">angular velocity</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">torque between<br>−2 and 2</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">keep it upright</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">no end state; scored<br>by closeness to upright<br>and torque used</span><span class="io-item">over 200 steps</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/PendulumControl-v1</code></span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Physics</strong>: gravity, mass, length, maximum torque, maximum speed, time step</span><span class="io-item"><strong>Colours</strong>: background, rod, hub</span><span class="io-item io-total">9 factors in total</span></span></div></div>

<figure class="fig-small">
  <img src="../../assets/posts/stable-worldmodel/classic-pendulum.png" alt="The Pendulum environment: a red pole swinging around a pivot, with an arrow showing the applied torque." width="248" height="248" loading="lazy" decoding="async">
  <figcaption>Pendulum: the pole on its pivot. Rendered with <a href="https://github.com/galilai-group/stable-worldmodel">swm</a>.</figcaption>
</figure>

}{cfyb row: Pendulum — swing a pendulum up and balance it}

{

A point moves inside a 5 × 5 square that holds 4 to 6 random rectangular walls, and has to reach a goal. Moves that would hit a wall are blocked.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">500 × 500 RGB render</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">position (x, y)</span><span class="io-item">each between 0 and 5</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">step (dx, dy)</span><span class="io-item">each between<br>−0.2 and 0.2</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">the goal position</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">point within the<br>goal radius</span><span class="io-item">(0.2 by default)</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/SimplePointMaze-v0</code></span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Agent</strong>: colour, size, start position, speed</span><span class="io-item"><strong>Goal</strong>: colour, size, position</span><span class="io-item"><strong>Walls</strong>: number, colour, shape, positions</span><span class="io-item"><strong>Background</strong>: colour</span></span></div></div>

<figure class="fig-small">
  <img src="../../assets/posts/stable-worldmodel/classic-pointmaze.png" alt="The point maze environment: a red point at the bottom, black rectangular walls, and a green goal in the top right corner." width="248" height="248" loading="lazy" decoding="async">
  <figcaption>Point maze: the point, the walls and the goal. Rendered with <a href="https://github.com/galilai-group/stable-worldmodel">swm</a>.</figcaption>
</figure>

}{cfyb row: Point maze — reach a goal around random walls}

}{cfyb paper: Classic control — 5 environments: CartPole, MountainCar, Acrobot, Pendulum, point maze}

{

A Fetch robot arm moves a block, or just its gripper, to a goal position. Four tasks,
each in three versions: sparse reward, dense reward (`Dense`), and dictionary observations
(`Dict`).

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">224 × 224 RGB</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">gripper position<br>(x, y, z)</span><span class="io-item">gripper finger positions</span><span class="io-item">gripper velocity</span><span class="io-item">with an object:</span><span class="io-item io-sub">position</span><span class="io-item io-sub">position relative<br>to the gripper</span><span class="io-item io-sub">rotation</span><span class="io-item io-sub">velocities</span><span class="io-item">then the goal (x, y, z)</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">gripper move<br>(dx, dy, dz)</span><span class="io-item">gripper open/close (g)</span><span class="io-item">each between −1 and 1</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">a target position<br>(x, y, z)</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">object (or gripper)<br>within 5 cm</span><span class="io-item">50 steps per episode</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/FetchReach-v3</code></span><span class="io-item"><code>swm/FetchPush-v3</code></span><span class="io-item"><code>swm/FetchSlide-v3</code></span><span class="io-item"><code>swm/FetchPickAndPlace-v3</code></span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Scene</strong>: table, object and background colour, light, camera angle</span><span class="io-item"><strong>Positions</strong>: start and goal</span><span class="io-item"><strong>Block</strong>: mass, start position, angle (tasks with a block)</span><span class="io-item"><strong>Rendering</strong>: transparent arm</span><span class="io-item io-total">8 to 11 factors in total, depending on the task</span></span></div></div>

<figure>
  <img src="../../assets/posts/stable-worldmodel/fetch.gif" alt="Four animations in a grid of a Fetch robot arm at a table: reaching, pushing a block, sliding a puck and picking and placing a block." width="452" height="452" loading="lazy" decoding="async">
  <figcaption>Fetch reach, push, slide and pick-and-place. Animation from the <a href="https://github.com/galilai-group/stable-worldmodel">swm docs</a>.</figcaption>
</figure>

}{cfyb paper: Fetch — 4 tasks (reach, push, slide, pick-and-place), 3 versions each}

{

A 2D, Minecraft-like world, seen from above. The agent gathers resources, crafts tools,
fights creatures and has to eat, drink and sleep to survive. It only sees the area around
it. There are two versions: **Classic**, a single overworld map, and **Full**, which adds
dungeons on several floors, ranged combat and magic. Both come with pixel or symbolic
observations, and both run on JAX.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">Classic: 63 × 63 RGB</span><span class="io-item">Full: 130 × 110 RGB</span></span></div><div class="io-row"><span class="io-key">Symbolic</span><span class="io-val"><span class="io-item">map, inventory and<br>stats as one vector</span><span class="io-item">Classic: 1,345 values</span><span class="io-item">Full: 8,268 values</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">discrete</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">Classic: one of 17<br>(move, do, sleep,<br>place, make…)</span><span class="io-item">Full: one of 43<br>(adds combat, magic,<br>floor changes)</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">no fixed goal</span></span></div><div class="io-row"><span class="io-key">Score</span><span class="io-val"><span class="io-item">achievements unlocked</span><span class="io-item">Classic: 22, Full: 69+</span></span></div><div class="io-row"><span class="io-key">Ends</span><span class="io-val"><span class="io-item">when the player dies</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/CraftaxClassicPixels-v1</code></span><span class="io-item"><code>swm/CraftaxClassicSymbolic-v1</code></span><span class="io-item"><code>swm/CraftaxPixels-v1</code></span><span class="io-item"><code>swm/CraftaxSymbolic-v1</code></span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Visual wrappers</strong>: blur, noise, colour jitter, occlusion and others</span><span class="io-item io-total">no native factors; the simulator cannot be changed from the inside</span></span></div></div>

<figure>
  <img src="../../assets/posts/stable-worldmodel/craftax.gif" alt="An animation of Craftax: a player moving through a top-down, Minecraft-like world of grass, trees and water." width="224" height="224" loading="lazy" decoding="async">
  <figcaption>Craftax, the full version. Animation from the <a href="https://github.com/galilai-group/stable-worldmodel">swm docs</a>.</figcaption>
</figure>

}{cfyb paper: Craftax — 4 versions of a long-horizon, open-world survival game}

{

The Arcade Learning Environment: classic Atari games with visual wrappers for factors
of variation.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">210 × 160 RGB<br>game screen</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">discrete</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">one joystick move</span><span class="io-item">up to 18: directions,<br>fire, combinations</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">the game's score</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>ALE/&lt;Game&gt;-v5</code></span><span class="io-item">for example <code>ALE/Pong-v5</code></span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Visual wrappers</strong>: colours, backgrounds and other image changes</span></span></div></div>

<figure>
  <img src="../../assets/posts/stable-worldmodel/ale.png" alt="A grid of Atari game screens including maze, shooter and platform games." width="672" height="672" loading="lazy" decoding="async">
  <figcaption>Arcade Learning Environment games. Figure from <a href="https://arxiv.org/abs/2605.21800">stable-worldmodel</a> (2026).</figcaption>
</figure>

}{cfyb paper: Atari — over 100 arcade games}

{

A physics-based rocket (PyFlyt) must land upright on a landing pad without running out of
fuel or hitting too hard. Its action has seven continuous components, and its dynamics
are unforgiving.

<div class="io-grid"><div class="io-card io-in"><div class="io-head">Observe</div><div class="io-row"><span class="io-key">Image</span><span class="io-val"><span class="io-item">480 × 480 RGB</span></span></div><div class="io-row"><span class="io-key">State</span><span class="io-val"><span class="io-item">angular velocity<br>(ωx, ωy, ωz)</span><span class="io-item">attitude (quaternion<br>by default)</span><span class="io-item">velocity (vx, vy, vz)</span><span class="io-item">position (x, y, z)</span><span class="io-item">previous action</span><span class="io-item">auxiliary readings</span><span class="io-item">pad contact (yes / no)</span></span></div></div><div class="io-card io-act"><div class="io-head">Act</div><div class="io-row"><span class="io-key">Type</span><span class="io-val"><span class="io-item">continuous</span></span></div><div class="io-row"><span class="io-key">Action</span><span class="io-val"><span class="io-item">finlets (x, y, roll)</span><span class="io-item">booster ignition</span><span class="io-item">throttle</span><span class="io-item">booster gimbal (x, y)</span></span></div></div><div class="io-card io-goal"><div class="io-head">Goal</div><div class="io-row"><span class="io-key">Given as</span><span class="io-val"><span class="io-item">the landing pad</span></span></div><div class="io-row"><span class="io-key">Success</span><span class="io-val"><span class="io-item">on the pad,<br>nearly upright</span><span class="io-item">angular speed below 5</span><span class="io-item">speed below 4</span></span></div></div></div>
<div class="io-meta"><div class="io-row"><span class="io-key">ID</span><span class="io-val"><span class="io-item"><code>swm/PFRocketLanding-v0</code></span></span></div><div class="io-row"><span class="io-key">Varies</span><span class="io-val"><span class="io-item"><strong>Colours</strong>: rocket, pad, sky</span><span class="io-item"><strong>Start</strong>: height, horizontal offset, tilt</span></span></div></div>

}{cfyb paper: Rocket landing — land a rocket on a pad}

## Factors of variation

Each environment comes with a set of factors that can be changed independently: colours,
sizes and shapes of objects, lighting, camera angle, background, and physical properties
such as mass and friction. A model trained under default settings can then be tested
under a controlled shift, one factor at a time, or several together.

<figure>
  <img src="../../assets/posts/stable-worldmodel/robotics-variations.png" alt="A grid of robot manipulation scenes with randomised colours of the arm, table, floor and objects, different lighting, and black occluding squares." width="678" height="678" loading="lazy" decoding="async">
  <figcaption>All visual factors changed at once. Figure from <a href="https://arxiv.org/abs/2605.21800">stable-worldmodel</a> (2026).</figcaption>
</figure>

On top of these, 11 visual wrappers (blur, noise, colour jitter, occlusion and others)
can be applied to any environment, changing only the image the model sees. They are the
only source of variation for Atari and Craftax, whose simulators cannot be changed from
the inside.

<figure>
  <img src="../../assets/posts/stable-worldmodel/visual-wrappers.png" alt="Ten copies of the same Craftax frame: the default image, then with blur, noise, colour jitter, grayscale, a moving white patch, black occluding rectangles, a random convolution, a random shift and a lower resolution." width="2354" height="1134" loading="lazy" decoding="async">
  <figcaption>Visual wrappers on a Craftax frame. Figure from <a href="https://arxiv.org/abs/2605.21800">stable-worldmodel</a> (2026).</figcaption>
</figure>

{

By default, only a few factors are randomised at every reset, usually the start and goal
positions; the rest stay at their default values. Other factors are switched on per
reset with the `variation` option, and can be set to exact values with
`variation_values`:

```python
import numpy as np
import stable_worldmodel as swm

world = swm.World("swm/PushT-v1", num_envs=1, image_shape=(224, 224))

# Randomise only these factors at this reset
world.reset(seed=0, options={"variation": ["agent.color", "block.color"]})

# Randomise every factor
world.reset(seed=0, options={"variation": ["all"]})

# Set a factor to an exact value
world.reset(seed=0, options={
    "variation": ["agent.color"],
    "variation_values": {"agent.color": np.array([255, 0, 0], dtype=np.uint8)},
})
```

To list every factor of an environment, with its type, range and default:

```bash
swm fovs swm/PushT-v1
```

}{cfyb code: Code example — how to change factors}

## Summary

stable-worldmodel puts the whole world-model workflow in one library: collecting data in
about 150 environments, training with ready-made baselines, and evaluating by planning
with a choice of solvers. Its factors of variation and visual wrappers make it possible to
change one thing at a time, colours, shapes, physics or the image itself, and see how a
world model copes.

{

One thing I think would be nice to have is a unified, live leaderboard, as results for
world models are currently spread across papers and docs, each with its own budget and
settings. As interest in world models grows and more and more researchers start working
on them, the lack of a live leaderboard makes it harder to see where the field stands.

I hope that in the near future we will see such live leaderboards, or platforms that track
the state of the art in world models, keeping everything in one place and making it much
easier to navigate. Maybe I will try to build one myself, maybe not, who knows?! 😄

}{cfyb: My thoughts}

[Paper](https://arxiv.org/abs/2605.21800) · [Code](https://github.com/galilai-group/stable-worldmodel)
