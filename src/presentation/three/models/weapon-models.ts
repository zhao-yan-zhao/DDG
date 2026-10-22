/**
 * 《孤城神机营》- Procedural 3D Weapon Models (Three.js)
 * High-fidelity 3D meshes for all 16 Ming Dynasty defensive war machines.
 * Features:
 * - MeshStandardMaterial with PBR metalness, roughness, and emissive lighting
 * - Star-level visual scaling (★1 to ★4)
 * - Faction-specific mineral pigment and metal finishes
 * - Footprint-aware geometry dimensions (1x1, 1x2, 2x1, 2x2)
 */

import * as THREE from 'three';
import { WeaponInstance, Faction } from '../../../core/types';

export class WeaponModelFactory {
  // Shared materials for PBR performance
  private static bronzeMaterial = new THREE.MeshStandardMaterial({
    color: 0xc89842,
    metalness: 0.85,
    roughness: 0.35
  });

  private static ironMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e343b,
    metalness: 0.7,
    roughness: 0.5
  });

  private static walnutWoodMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a2412,
    metalness: 0.05,
    roughness: 0.75
  });

  private static brassMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfab35,
    metalness: 0.9,
    roughness: 0.25
  });

  private static emberMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3300,
    emissive: 0xff4400,
    emissiveIntensity: 2.0,
    roughness: 0.2
  });

  private static caltropMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2228,
    metalness: 0.8,
    roughness: 0.4
  });

  private static electricGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00bcd4,
    emissiveIntensity: 1.8,
    roughness: 0.1
  });

  private static stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a636e,
    metalness: 0.15,
    roughness: 0.85
  });

  private static drumHeadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9c8a9,
    metalness: 0.05,
    roughness: 0.7
  });

  private static crimsonLacquerMaterial = new THREE.MeshStandardMaterial({
    color: 0x9b1b1b,
    metalness: 0.3,
    roughness: 0.35
  });

  /**
   * Builds a 3D weapon group based on weapon configId and star level.
   */
  public static createWeaponMesh(weapon: WeaponInstance): THREE.Group {
    const root = new THREE.Group();
    root.name = `weapon_${weapon.id}`;

    switch (weapon.configId) {
      // 1. 神机火器 (Fire)
      case 'fire_lance':
        root.add(this.createFireLance(weapon.star));
        break;
      case 'rocket_box':
        root.add(this.createRocketCart(weapon.star));
        break;
      case 'thunder_thrower':
        root.add(this.createThunderThrower(weapon.star));
        break;
      case 'red_cannon':
      case 'cannon':
        root.add(this.createHongyiCannon(weapon.star));
        break;

      // 2. 墨家机关 (Mohist)
      case 'flame_beast':
        root.add(this.createFlameBeast(weapon.star));
        break;
      case 'repeating_crossbow':
        root.add(this.createRepeatingCrossbow(weapon.star));
        break;
      case 'bed_crossbow':
        root.add(this.createBedCrossbow(weapon.star));
        break;
      case 'catapult':
        root.add(this.createCatapult(weapon.star));
        break;

      // 3. 城防工事 (Fortress)
      case 'barricade':
      case 'iron_barricade':
        root.add(this.createBarricade(weapon.star));
        break;
      case 'oil_cabinet':
        root.add(this.createOilCabinet(weapon.star));
        break;
      case 'electric_grid':
      case 'iron_caltrop':
        root.add(this.createElectricGrid(weapon.star));
        break;
      case 'spear_camp':
        root.add(this.createSpearCamp(weapon.star));
        break;

      // 4. 奇门辅佐 (Qimen)
      case 'powder_bureau':
        root.add(this.createPowderBureau(weapon.star));
        break;
      case 'war_drum':
        root.add(this.createWarDrum(weapon.star));
        break;
      case 'stargazer':
        root.add(this.createStargazer(weapon.star));
        break;
      case 'luban_workshop':
        root.add(this.createLubanWorkshop(weapon.star));
        break;

      default:
        root.add(this.createFireLance(weapon.star));
        break;
    }

    // Scale according to star level
    const starScale = 1.0 + (weapon.star - 1) * 0.12;
    root.scale.set(starScale, starScale, starScale);

    // Initial 2.5D angle: tilted facing forward-right
    root.rotation.x = THREE.MathUtils.degToRad(-35);
    root.rotation.y = THREE.MathUtils.degToRad(25);

    return root;
  }

  // =========================================================================
  // 1. 神机火器系 (Fire Faction)
  // =========================================================================

  /**
   * 1.1 神机火铳 (Fire Lance / Hand Cannon - 1x1)
   */
  private static createFireLance(star: number): THREE.Group {
    const group = new THREE.Group();

    // Octagonal Bronze Barrel
    const barrelGeo = new THREE.CylinderGeometry(2.4, 2.8, 38, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, this.bronzeMaterial);
    barrel.position.set(0, 5, 8);
    barrel.castShadow = true;
    group.add(barrel);

    // Muzzle Flange (Dragon mouth flare)
    const muzzleGeo = new THREE.CylinderGeometry(3.6, 2.6, 6, 8);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzle = new THREE.Mesh(muzzleGeo, this.brassMaterial);
    muzzle.position.set(0, 5, 28);
    group.add(muzzle);

    // Dark walnut wooden stock & grip
    const stockGeo = new THREE.BoxGeometry(4, 7, 24);
    const stock = new THREE.Mesh(stockGeo, this.walnutWoodMaterial);
    stock.position.set(0, 1, -10);
    stock.rotation.x = THREE.MathUtils.degToRad(15);
    stock.castShadow = true;
    group.add(stock);

    // Brass barrel bands
    for (const z of [2, 12, 22]) {
      const bandGeo = new THREE.TorusGeometry(3.0, 0.6, 8, 16);
      const band = new THREE.Mesh(bandGeo, this.brassMaterial);
      band.position.set(0, 5, z);
      group.add(band);
    }

    // Serpentine matchlock & glowing match cord
    const matchGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const match = new THREE.Mesh(matchGeo, this.emberMaterial);
    match.position.set(2.8, 8, 2);
    group.add(match);

    return group;
  }

  /**
   * 1.2 一窝蜂火箭车 (Nest of Bees Multi-rocket Launcher Cart - 1x1)
   */
  private static createRocketCart(star: number): THREE.Group {
    const group = new THREE.Group();

    // Hexagonal Rocket Box Housing (tilted upwards)
    const boxGeo = new THREE.BoxGeometry(16, 14, 28);
    const box = new THREE.Mesh(boxGeo, this.walnutWoodMaterial);
    box.position.set(0, 12, 2);
    box.rotation.x = THREE.MathUtils.degToRad(-25);
    box.castShadow = true;
    group.add(box);

    // Rocket Tubes Face (Front grid)
    const faceGeo = new THREE.PlaneGeometry(15, 13);
    const face = new THREE.Mesh(faceGeo, this.ironMaterial);
    face.position.set(0, 18, 14.2);
    face.rotation.x = THREE.MathUtils.degToRad(-25);
    group.add(face);

    // Rocket Arrow Tips protruding with glowing fuses
    for (let row = -1; row <= 1; row++) {
      for (let col = -1; col <= 1; col++) {
        const tipGeo = new THREE.ConeGeometry(1.2, 4, 6);
        tipGeo.rotateX(Math.PI / 2);
        const tip = new THREE.Mesh(tipGeo, this.emberMaterial);
        tip.position.set(col * 4.5, 18 + row * 4.0, 16.5);
        tip.rotation.x = THREE.MathUtils.degToRad(-25);
        group.add(tip);
      }
    }

    // Two-wheeled Cart Chassis
    const axleGeo = new THREE.CylinderGeometry(1.2, 1.2, 24, 8);
    axleGeo.rotateZ(Math.PI / 2);
    const axle = new THREE.Mesh(axleGeo, this.ironMaterial);
    axle.position.set(0, 5, -2);
    group.add(axle);

    const wheelGeo = new THREE.CylinderGeometry(7, 7, 2.2, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    const w1 = new THREE.Mesh(wheelGeo, this.walnutWoodMaterial);
    w1.position.set(-11, 5, -2);
    w1.castShadow = true;
    group.add(w1);

    const w2 = new THREE.Mesh(wheelGeo, this.walnutWoodMaterial);
    w2.position.set(11, 5, -2);
    w2.castShadow = true;
    group.add(w2);

    return group;
  }

  /**
   * 1.3 震天雷投手 (Thunder Thrower / Mortar - 1x1)
   */
  private static createThunderThrower(star: number): THREE.Group {
    const group = new THREE.Group();

    // Heavy Cast Iron Mortar Bowl (tilted mortar chamber)
    const mortarGeo = new THREE.CylinderGeometry(8, 5, 18, 12);
    mortarGeo.rotateX(Math.PI / 2);
    const mortar = new THREE.Mesh(mortarGeo, this.ironMaterial);
    mortar.position.set(0, 10, 4);
    mortar.rotation.x = THREE.MathUtils.degToRad(-30);
    mortar.castShadow = true;
    group.add(mortar);

    // Bronze reinforced mouth ring
    const rimGeo = new THREE.TorusGeometry(8.2, 1.4, 8, 16);
    const rim = new THREE.Mesh(rimGeo, this.bronzeMaterial);
    rim.position.set(0, 14.5, 12);
    rim.rotation.x = THREE.MathUtils.degToRad(-30);
    group.add(rim);

    // Cast-iron Thunder Ball sitting ready in muzzle with glowing fuse
    const bombGeo = new THREE.SphereGeometry(4.5, 12, 12);
    const bomb = new THREE.Mesh(bombGeo, this.caltropMaterial);
    bomb.position.set(0, 12, 8);
    group.add(bomb);

    const fuseGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const fuse = new THREE.Mesh(fuseGeo, this.emberMaterial);
    fuse.position.set(0, 16, 10);
    group.add(fuse);

    // Heavy Walnut Timber Mortar Bed & Trunnion Supports
    const bedGeo = new THREE.BoxGeometry(22, 7, 24);
    const bed = new THREE.Mesh(bedGeo, this.walnutWoodMaterial);
    bed.position.set(0, 3.5, 0);
    bed.castShadow = true;
    group.add(bed);

    // Additional readied thunder bombs stacked on the bed
    for (const offset of [-6, 6]) {
      const spareBomb = new THREE.Mesh(new THREE.SphereGeometry(3.0, 8, 8), this.ironMaterial);
      spareBomb.position.set(offset, 9, -5);
      group.add(spareBomb);
    }

    return group;
  }

  /**
   * 1.4 红衣大炮 (Hongyi Heavy Cannon - 1x2 footprint)
   * Authentic Ming heavy artillery with realistic proportions (no artificial elongation).
   */
  private static createHongyiCannon(star: number): THREE.Group {
    const group = new THREE.Group();

    // Heavy Tapered Bronze Cannon Barrel
    const barrelGeo = new THREE.CylinderGeometry(3.8, 6.0, 40, 16);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, this.bronzeMaterial);
    barrel.position.set(0, 12, 4);
    barrel.rotation.x = THREE.MathUtils.degToRad(-15);
    barrel.castShadow = true;
    group.add(barrel);

    // Heavy Muzzle Lip
    const lipGeo = new THREE.TorusGeometry(4.8, 1.2, 8, 20);
    const lip = new THREE.Mesh(lipGeo, this.brassMaterial);
    lip.position.set(0, 17, 23);
    lip.rotation.x = THREE.MathUtils.degToRad(-15);
    group.add(lip);

    // Reinforced Iron Carriage Chassis
    const carriageGeo = new THREE.BoxGeometry(16, 8, 28);
    const carriage = new THREE.Mesh(carriageGeo, this.ironMaterial);
    carriage.position.set(0, 6, 0);
    carriage.castShadow = true;
    group.add(carriage);

    // 2 Large Wooden Carriage Wheels
    const wheelGeo = new THREE.CylinderGeometry(7.5, 7.5, 2.4, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const leftWheel = new THREE.Mesh(wheelGeo, this.walnutWoodMaterial);
    leftWheel.position.set(-10, 7.5, 0);
    leftWheel.castShadow = true;
    group.add(leftWheel);

    const rightWheel = new THREE.Mesh(wheelGeo, this.walnutWoodMaterial);
    rightWheel.position.set(10, 7.5, 0);
    rightWheel.castShadow = true;
    group.add(rightWheel);

    // Iron Rims on Wheels
    for (const wheelX of [-10, 10]) {
      const rimGeo = new THREE.TorusGeometry(7.5, 0.7, 8, 20);
      rimGeo.rotateY(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, this.ironMaterial);
      rim.position.set(wheelX, 7.5, 0);
      group.add(rim);
    }

    return group;
  }

  // =========================================================================
  // 2. 墨家机关系 (Mohist Faction)
  // =========================================================================

  /**
   * 2.1 机关喷火兽 (Mechanized Flame Beast - 1x1)
   */
  private static createFlameBeast(star: number): THREE.Group {
    const group = new THREE.Group();

    // Bronze Qilin / Dragon Monster Snout
    const headGeo = new THREE.BoxGeometry(14, 12, 18);
    const head = new THREE.Mesh(headGeo, this.bronzeMaterial);
    head.position.set(0, 9, 2);
    head.castShadow = true;
    group.add(head);

    // Gaping Maw Nozzle
    const mawGeo = new THREE.CylinderGeometry(4.5, 3.5, 8, 8);
    mawGeo.rotateX(Math.PI / 2);
    const maw = new THREE.Mesh(mawGeo, this.ironMaterial);
    maw.position.set(0, 8, 12);
    group.add(maw);

    // Glowing flame core inside snout
    const fireCoreGeo = new THREE.SphereGeometry(2.5, 8, 8);
    const fireCore = new THREE.Mesh(fireCoreGeo, this.emberMaterial);
    fireCore.position.set(0, 8, 14);
    group.add(fireCore);

    // Mythological Horns
    for (const side of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(1.5, 7, 6);
      hornGeo.rotateX(-Math.PI / 4);
      const horn = new THREE.Mesh(hornGeo, this.brassMaterial);
      horn.position.set(side * 5, 16, -2);
      group.add(horn);
    }

    // Flanking Bellow Chambers with Walnut Ribs
    for (const side of [-1, 1]) {
      const bellowGeo = new THREE.BoxGeometry(5, 9, 14);
      const bellow = new THREE.Mesh(bellowGeo, this.walnutWoodMaterial);
      bellow.position.set(side * 9, 8, 0);
      group.add(bellow);
    }

    // Heavy iron stand with clawed feet
    const baseGeo = new THREE.BoxGeometry(22, 4, 22);
    const base = new THREE.Mesh(baseGeo, this.ironMaterial);
    base.position.set(0, 2, 0);
    group.add(base);

    return group;
  }

  /**
   * 2.2 诸葛连弩 (Zhuge Repeating Crossbow - 1x1)
   */
  private static createRepeatingCrossbow(star: number): THREE.Group {
    const group = new THREE.Group();

    // Wooden Stock
    const stockGeo = new THREE.BoxGeometry(4.5, 5, 34);
    const stock = new THREE.Mesh(stockGeo, this.walnutWoodMaterial);
    stock.position.set(0, 4, 0);
    stock.castShadow = true;
    group.add(stock);

    // Crossbow Bow Prods (Curved horn arms)
    const bowGeo = new THREE.BoxGeometry(32, 2.5, 2.5);
    const bow = new THREE.Mesh(bowGeo, this.walnutWoodMaterial);
    bow.position.set(0, 4, 15);
    group.add(bow);

    // Top Wooden Arrow Magazine Box (箭匣)
    const magGeo = new THREE.BoxGeometry(7.5, 9, 18);
    const mag = new THREE.Mesh(magGeo, this.walnutWoodMaterial);
    mag.position.set(0, 10, -2);
    mag.castShadow = true;
    group.add(mag);

    // Brass corner braces on magazine
    const braceGeo = new THREE.BoxGeometry(8.2, 2, 18.6);
    const brace = new THREE.Mesh(braceGeo, this.brassMaterial);
    brace.position.set(0, 14, -2);
    group.add(brace);

    // Brass Winch Mechanism & Gears
    const gearGeo = new THREE.CylinderGeometry(3.5, 3.5, 1.5, 12);
    gearGeo.rotateZ(Math.PI / 2);
    const gear = new THREE.Mesh(gearGeo, this.brassMaterial);
    gear.position.set(4, 5, -8);
    group.add(gear);

    return group;
  }

  /**
   * 2.3 八牛床弩 (Eight-Ox Heavy Siege Ballista - 2x1 horizontal footprint)
   * Sturdy, authentic Ming three-bow siege ballista (三弓床弩).
   * Proportional geometry without artificial stretching across multi-grid footprint.
   */
  private static createBedCrossbow(star: number): THREE.Group {
    const group = new THREE.Group();

    // Heavy Walnut Timber Bed Frame (chassis)
    const bedGeo = new THREE.BoxGeometry(26, 7, 28);
    const bed = new THREE.Mesh(bedGeo, this.walnutWoodMaterial);
    bed.position.set(0, 4.5, 0);
    bed.castShadow = true;
    group.add(bed);

    // Four sturdy corner footing blocks
    for (const dx of [-11, 11]) {
      for (const dz of [-11, 11]) {
        const footGeo = new THREE.BoxGeometry(4, 5, 4);
        const foot = new THREE.Mesh(footGeo, this.ironMaterial);
        foot.position.set(dx, 2.5, dz);
        group.add(foot);
      }
    }

    // Triple Recurve Bow Prods (authentic composite bows mounted on forward trestle)
    const mainBowGeo = new THREE.BoxGeometry(34, 3.5, 3);
    const mainBow = new THREE.Mesh(mainBowGeo, this.walnutWoodMaterial);
    mainBow.position.set(0, 8, 11);
    group.add(mainBow);

    const secondaryBowGeo = new THREE.BoxGeometry(28, 2.8, 2.5);
    const secondaryBow = new THREE.Mesh(secondaryBowGeo, this.ironMaterial);
    secondaryBow.position.set(0, 9.5, 9);
    group.add(secondaryBow);

    // Grooved brass center guide rail
    const railGeo = new THREE.BoxGeometry(4.5, 2, 24);
    const rail = new THREE.Mesh(railGeo, this.brassMaterial);
    rail.position.set(0, 8.5, 1);
    group.add(rail);

    // Heavy Piercing Spear-Bolt (一枪三剑箭)
    const boltGeo = new THREE.CylinderGeometry(1.2, 1.2, 28, 8);
    boltGeo.rotateX(Math.PI / 2);
    const bolt = new THREE.Mesh(boltGeo, this.ironMaterial);
    bolt.position.set(0, 9.5, 3);
    group.add(bolt);

    const tipGeo = new THREE.ConeGeometry(2.5, 6, 6);
    tipGeo.rotateX(Math.PI / 2);
    const tip = new THREE.Mesh(tipGeo, this.brassMaterial);
    tip.position.set(0, 9.5, 18);
    group.add(tip);

    // Winch windlass axle crossbar
    const axleGeo = new THREE.CylinderGeometry(1.2, 1.2, 29, 8);
    axleGeo.rotateZ(Math.PI / 2);
    const axle = new THREE.Mesh(axleGeo, this.ironMaterial);
    axle.position.set(0, 6, -6);
    group.add(axle);

    // Twin Winch Wheels on left and right flanks
    for (const side of [-14, 14]) {
      const wheelGeo = new THREE.CylinderGeometry(4.5, 4.5, 2.0, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wheelGeo, this.brassMaterial);
      wheel.position.set(side, 6, -6);
      group.add(wheel);
    }

    return group;
  }

  /**
   * 2.4 襄阳发石机 (Xiangyang Heavy Traction Catapult / Trebuchet - 2x2 footprint)
   */
  private static createCatapult(star: number): THREE.Group {
    const group = new THREE.Group();

    // Heavy A-Frame Timber Trestles (2x2 footprint)
    const baseGeo = new THREE.BoxGeometry(40, 4, 40);
    const base = new THREE.Mesh(baseGeo, this.walnutWoodMaterial);
    base.position.set(0, 2, 0);
    base.castShadow = true;
    group.add(base);

    // Triangular A-frame posts
    for (const x of [-16, 16]) {
      const postGeo = new THREE.BoxGeometry(4, 26, 4);
      const post = new THREE.Mesh(postGeo, this.walnutWoodMaterial);
      post.position.set(x, 15, 0);
      group.add(post);
    }

    // Cross axle connecting posts
    const axleGeo = new THREE.CylinderGeometry(2.5, 2.5, 34, 10);
    axleGeo.rotateZ(Math.PI / 2);
    const axle = new THREE.Mesh(axleGeo, this.ironMaterial);
    axle.position.set(0, 25, 0);
    group.add(axle);

    // Long Throwing Arm Beam
    const armGeo = new THREE.BoxGeometry(3.5, 3.5, 52);
    const arm = new THREE.Mesh(armGeo, this.walnutWoodMaterial);
    arm.position.set(0, 26, 4);
    arm.rotation.x = THREE.MathUtils.degToRad(-25);
    arm.castShadow = true;
    group.add(arm);

    // Heavy Iron Counterweight Box on short end
    const weightGeo = new THREE.BoxGeometry(14, 12, 12);
    const weight = new THREE.Mesh(weightGeo, this.ironMaterial);
    weight.position.set(0, 18, -18);
    group.add(weight);

    // Sling basket holding rough-hewn stone boulder
    const stoneGeo = new THREE.DodecahedronGeometry(5.5, 0);
    const stone = new THREE.Mesh(stoneGeo, this.stoneMaterial);
    stone.position.set(0, 36, 26);
    group.add(stone);

    // Icy glow highlight for Mohist ice mutation
    const iceGlow = new THREE.Mesh(new THREE.SphereGeometry(2.0, 6, 6), this.electricGlowMaterial);
    iceGlow.position.set(0, 37, 26);
    group.add(iceGlow);

    return group;
  }

  // =========================================================================
  // 3. 城防工事系 (Fortress Faction - Frontline Row 0)
  // =========================================================================

  /**
   * 3.1 铁索拒马 (Iron-Chained Wooden Barricade - 1x1 Row 0)
   */
  private static createBarricade(star: number): THREE.Group {
    const group = new THREE.Group();

    // Crossed walnut barricade stakes
    for (const rotY of [-25, 25]) {
      const stakeGeo = new THREE.CylinderGeometry(1.6, 2.2, 30, 8);
      stakeGeo.rotateZ(Math.PI / 4);
      stakeGeo.rotateY(THREE.MathUtils.degToRad(rotY));
      const stake = new THREE.Mesh(stakeGeo, this.walnutWoodMaterial);
      stake.position.set(0, 8, 0);
      stake.castShadow = true;
      group.add(stake);
    }

    // Heavy Iron Chains wrapped horizontally
    const chainGeo = new THREE.TorusGeometry(12, 1.2, 6, 16);
    chainGeo.rotateX(Math.PI / 2);
    const chain = new THREE.Mesh(chainGeo, this.ironMaterial);
    chain.position.set(0, 8, 0);
    group.add(chain);

    // Iron Caltrop Spikes bristling outward
    for (let i = 0; i < 4; i++) {
      const caltropGeo = new THREE.ConeGeometry(2.2, 9, 4);
      const caltrop = new THREE.Mesh(caltropGeo, this.caltropMaterial);
      const angle = (i * Math.PI) / 2;
      caltrop.position.set(Math.cos(angle) * 9, 5, Math.sin(angle) * 9);
      caltrop.rotation.x = Math.PI / 5;
      caltrop.rotation.y = angle;
      group.add(caltrop);
    }

    return group;
  }

  /**
   * 3.2 猛火油柜 (Fierce Fire Oil Cabinet / Siphon - 1x1 Row 0)
   */
  private static createOilCabinet(star: number): THREE.Group {
    const group = new THREE.Group();

    // Heavy Bronze Oil Vat Reservoir
    const vatGeo = new THREE.BoxGeometry(20, 12, 18);
    const vat = new THREE.Mesh(vatGeo, this.bronzeMaterial);
    vat.position.set(0, 7, 0);
    vat.castShadow = true;
    group.add(vat);

    // Vertical Brass Double-Action Piston Pump Cylinder
    const pumpGeo = new THREE.CylinderGeometry(3.2, 3.2, 16, 10);
    const pump = new THREE.Mesh(pumpGeo, this.brassMaterial);
    pump.position.set(0, 18, -2);
    group.add(pump);

    // Walnut Pump Handle Crossbar
    const handleGeo = new THREE.BoxGeometry(16, 2.5, 2.5);
    const handle = new THREE.Mesh(handleGeo, this.walnutWoodMaterial);
    handle.position.set(0, 26, -2);
    group.add(handle);

    // Curved Copper Siphon Discharge Pipe with Twin Nozzles
    const pipeGeo = new THREE.CylinderGeometry(1.4, 1.4, 18, 8);
    pipeGeo.rotateX(Math.PI / 2);
    const pipe = new THREE.Mesh(pipeGeo, this.bronzeMaterial);
    pipe.position.set(0, 14, 12);
    pipe.rotation.x = THREE.MathUtils.degToRad(-15);
    group.add(pipe);

    // Fiery dripping pitch droplet at nozzle tip
    const dripGeo = new THREE.SphereGeometry(2.0, 8, 8);
    const drip = new THREE.Mesh(dripGeo, this.emberMaterial);
    drip.position.set(0, 12, 21);
    group.add(drip);

    return group;
  }

  /**
   * 3.3 陷马电网 (Electrified Caltrop Grid - 1x1 Row 0)
   */
  private static createElectricGrid(star: number): THREE.Group {
    const group = new THREE.Group();

    // 4 Corner Iron Conductive Pylon Stakes
    for (const dx of [-9, 9]) {
      for (const dz of [-9, 9]) {
        const pylonGeo = new THREE.CylinderGeometry(1.2, 1.8, 16, 8);
        const pylon = new THREE.Mesh(pylonGeo, this.ironMaterial);
        pylon.position.set(dx, 8, dz);
        group.add(pylon);

        const insulatorGeo = new THREE.SphereGeometry(2.2, 8, 8);
        const ins = new THREE.Mesh(insulatorGeo, this.brassMaterial);
        ins.position.set(dx, 16, dz);
        group.add(ins);
      }
    }

    // Glowing Cyan Lightning Rings (Mohist Thunder Runes)
    const ringGeo = new THREE.TorusGeometry(8.5, 1.0, 8, 20);
    ringGeo.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, this.electricGlowMaterial);
    ring.position.set(0, 5, 0);
    group.add(ring);

    // Central Pulsating Energy Core
    const coreGeo = new THREE.OctahedronGeometry(3.5, 0);
    const core = new THREE.Mesh(coreGeo, this.electricGlowMaterial);
    core.position.set(0, 9, 0);
    group.add(core);

    return group;
  }

  /**
   * 3.4 白杆长枪营 (White-Wax Spear Garrison - 1x1 Row 0)
   */
  private static createSpearCamp(star: number): THREE.Group {
    const group = new THREE.Group();

    // 3 Defensive Oak & Iron Pavise Mantlet Shields
    for (const offset of [-6, 0, 6]) {
      const shieldGeo = new THREE.BoxGeometry(6, 14, 2);
      const shield = new THREE.Mesh(shieldGeo, this.walnutWoodMaterial);
      shield.position.set(offset, 8, 4);
      shield.rotation.y = THREE.MathUtils.degToRad(offset * -3);
      shield.castShadow = true;
      group.add(shield);

      const rimGeo = new THREE.BoxGeometry(6.4, 1.5, 2.4);
      const rim = new THREE.Mesh(rimGeo, this.ironMaterial);
      rim.position.set(offset, 15, 4);
      group.add(rim);
    }

    // 4 Long White-Wax Pikes angled forward over the shields
    for (let i = 0; i < 4; i++) {
      const x = -7.5 + i * 5;
      const spearGeo = new THREE.CylinderGeometry(0.8, 0.8, 38, 8);
      spearGeo.rotateX(Math.PI / 2);
      const spear = new THREE.Mesh(spearGeo, this.drumHeadMaterial);
      spear.position.set(x, 10, 8);
      spear.rotation.x = THREE.MathUtils.degToRad(-25);
      group.add(spear);

      // Steel leaf tip
      const tipGeo = new THREE.ConeGeometry(1.4, 5, 6);
      tipGeo.rotateX(Math.PI / 2);
      const tip = new THREE.Mesh(tipGeo, this.ironMaterial);
      tip.position.set(x, 17, 24);
      tip.rotation.x = THREE.MathUtils.degToRad(-25);
      group.add(tip);

      // Crimson tassel
      const tasselGeo = new THREE.SphereGeometry(1.2, 6, 6);
      const tassel = new THREE.Mesh(tasselGeo, this.crimsonLacquerMaterial);
      tassel.position.set(x, 15.5, 21);
      group.add(tassel);
    }

    return group;
  }

  // =========================================================================
  // 4. 奇门辅佐系 (Qimen Faction)
  // =========================================================================

  /**
   * 4.1 火药局 (Imperial Powder Bureau - 1x1)
   */
  private static createPowderBureau(star: number): THREE.Group {
    const group = new THREE.Group();

    // Ming Military Supply Depot Kiosk Base
    const baseGeo = new THREE.BoxGeometry(22, 8, 20);
    const base = new THREE.Mesh(baseGeo, this.walnutWoodMaterial);
    base.position.set(0, 4, 0);
    base.castShadow = true;
    group.add(base);

    // Tiered upturned eave roof
    const roofGeo = new THREE.ConeGeometry(18, 6, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, this.ironMaterial);
    roof.position.set(0, 16, 0);
    group.add(roof);

    // 3 Stacked Black Powder Barrels with Brass Hoops
    for (const [x, z] of [[-4, 4], [4, 4], [0, -4]]) {
      const barrelGeo = new THREE.CylinderGeometry(3.5, 4.0, 8, 10);
      const barrel = new THREE.Mesh(barrelGeo, this.walnutWoodMaterial);
      barrel.position.set(x, 8, z);
      group.add(barrel);

      const hoopGeo = new THREE.TorusGeometry(3.9, 0.5, 6, 12);
      hoopGeo.rotateX(Math.PI / 2);
      const hoop = new THREE.Mesh(hoopGeo, this.brassMaterial);
      hoop.position.set(x, 8, z);
      group.add(hoop);
    }

    // Ming Military Signal Pennant
    const poleGeo = new THREE.CylinderGeometry(0.6, 0.6, 26, 8);
    const pole = new THREE.Mesh(poleGeo, this.brassMaterial);
    pole.position.set(-8, 14, -7);
    group.add(pole);

    const bannerGeo = new THREE.ConeGeometry(3, 7, 3);
    bannerGeo.rotateZ(Math.PI / 2);
    const banner = new THREE.Mesh(bannerGeo, this.crimsonLacquerMaterial);
    banner.position.set(-4, 23, -7);
    group.add(banner);

    return group;
  }

  /**
   * 4.2 聚义战鼓 (Grand Alliance War Drum - 1x2 footprint)
   */
  private static createWarDrum(star: number): THREE.Group {
    const group = new THREE.Group();

    // Massive Cylindrical Crimson Lacquer Drum Body (1x2 vertical presence)
    const drumGeo = new THREE.CylinderGeometry(15, 15, 22, 16);
    drumGeo.rotateX(Math.PI / 2);
    const drum = new THREE.Mesh(drumGeo, this.crimsonLacquerMaterial);
    drum.position.set(0, 18, 0);
    drum.castShadow = true;
    group.add(drum);

    // Stretched Oxhide Drumheads on front and rear
    for (const z of [-11.1, 11.1]) {
      const headGeo = new THREE.CircleGeometry(14.5, 16);
      const head = new THREE.Mesh(headGeo, this.drumHeadMaterial);
      head.position.set(0, 18, z);
      if (z < 0) head.rotateY(Math.PI);
      group.add(head);

      // Brass Studded Rims
      const rimGeo = new THREE.TorusGeometry(14.8, 0.8, 6, 20);
      const rim = new THREE.Mesh(rimGeo, this.brassMaterial);
      rim.position.set(0, 18, z);
      group.add(rim);
    }

    // Heavy Carved Walnut Tripod Frame
    const frameGeo = new THREE.BoxGeometry(26, 8, 18);
    const frame = new THREE.Mesh(frameGeo, this.walnutWoodMaterial);
    frame.position.set(0, 4, 0);
    frame.castShadow = true;
    group.add(frame);

    // Crossed Drumsticks resting on rim
    for (const rotZ of [-30, 30]) {
      const stickGeo = new THREE.CylinderGeometry(0.8, 1.2, 22, 8);
      stickGeo.rotateZ(THREE.MathUtils.degToRad(rotZ));
      const stick = new THREE.Mesh(stickGeo, this.brassMaterial);
      stick.position.set(0, 28, 11.5);
      group.add(stick);
    }

    return group;
  }

  /**
   * 4.3 观星祭坛 (Celestial Astrolabe Altar - 1x1)
   */
  private static createStargazer(star: number): THREE.Group {
    const group = new THREE.Group();

    // Octagonal Stepped Stone Altar Dais
    const daisGeo = new THREE.CylinderGeometry(16, 18, 6, 8);
    const dais = new THREE.Mesh(daisGeo, this.stoneMaterial);
    dais.position.set(0, 3, 0);
    dais.castShadow = true;
    group.add(dais);

    // Concentric Interlocking Celestial Armillary Rings
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(12, 0.8, 8, 24), this.brassMaterial);
    ring1.position.set(0, 14, 0);
    ring1.rotation.x = Math.PI / 4;
    group.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(9.5, 0.8, 8, 24), this.bronzeMaterial);
    ring2.position.set(0, 14, 0);
    ring2.rotation.y = Math.PI / 3;
    group.add(ring2);

    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(7, 0.6, 8, 20), this.electricGlowMaterial);
    ring3.position.set(0, 14, 0);
    ring3.rotation.z = Math.PI / 6;
    group.add(ring3);

    // Central Floating Glowing Mystical Star Orb
    const orbGeo = new THREE.SphereGeometry(3.5, 12, 12);
    const orb = new THREE.Mesh(orbGeo, this.electricGlowMaterial);
    orb.position.set(0, 14, 0);
    group.add(orb);

    return group;
  }

  /**
   * 4.4 鲁班工坊 (Luban Mechanized Clockwork Workshop - 1x1)
   */
  private static createLubanWorkshop(star: number): THREE.Group {
    const group = new THREE.Group();

    // Master Artisan Workbench
    const benchGeo = new THREE.BoxGeometry(22, 6, 20);
    const bench = new THREE.Mesh(benchGeo, this.walnutWoodMaterial);
    bench.position.set(0, 4, 0);
    bench.castShadow = true;
    group.add(bench);

    // Intermeshing Rotating Brass & Iron Cogwheels
    const gear1Geo = new THREE.CylinderGeometry(6, 6, 1.8, 12);
    gear1Geo.rotateX(Math.PI / 2);
    const gear1 = new THREE.Mesh(gear1Geo, this.brassMaterial);
    gear1.position.set(-4, 12, 0);
    group.add(gear1);

    const gear2Geo = new THREE.CylinderGeometry(4.5, 4.5, 1.8, 10);
    const gear2 = new THREE.Mesh(gear2Geo, this.ironMaterial);
    gear2.position.set(5, 10, 0);
    group.add(gear2);

    // Articulated Wooden Crane Boom & Pulley
    const mastGeo = new THREE.BoxGeometry(2.5, 18, 2.5);
    const mast = new THREE.Mesh(mastGeo, this.walnutWoodMaterial);
    mast.position.set(6, 14, -6);
    group.add(mast);

    const jibGeo = new THREE.BoxGeometry(14, 2, 2);
    jibGeo.rotateZ(Math.PI / 6);
    const jib = new THREE.Mesh(jibGeo, this.walnutWoodMaterial);
    jib.position.set(2, 23, -6);
    group.add(jib);

    const weightGeo = new THREE.ConeGeometry(2, 4, 6);
    const weight = new THREE.Mesh(weightGeo, this.ironMaterial);
    weight.position.set(-3, 17, -6);
    group.add(weight);

    return group;
  }
}
