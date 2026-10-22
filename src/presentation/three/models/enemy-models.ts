/**
 * 《孤城神机营》- Procedural 3D Enemy Models (Three.js)
 * 3D character meshes for the 4 invading enemy archetypes:
 * - Ordinary (Light Infantry 流寇轻步兵)
 * - Charging (War Dog / Cavalry 狂暴战犬 / 轻骑兵)
 * - Heavy (Shield Guard / Iron Pagoda 重甲铁浮屠)
 * - Boss (Boss Bear / Demonic General 巨型暴熊 / 妖化统领)
 */

import * as THREE from 'three';
import { EnemyEntity } from '../../../core/types';

export class EnemyModelFactory {
  // Shared materials
  private static skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xd2a679,
    roughness: 0.8
  });

  private static clothArmorMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d4852,
    roughness: 0.9
  });

  private static redTurbanMaterial = new THREE.MeshStandardMaterial({
    color: 0x9b1b1b,
    roughness: 0.7
  });

  private static heavyIronMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c2127,
    metalness: 0.85,
    roughness: 0.35
  });

  private static goldTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfab35,
    metalness: 0.9,
    roughness: 0.25
  });

  private static demonicFurMaterial = new THREE.MeshStandardMaterial({
    color: 0x24141a,
    roughness: 0.95
  });

  private static demonicEyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0033,
    emissive: 0xff0022,
    emissiveIntensity: 2.5
  });

  /**
   * Creates 3D enemy entity group
   */
  public static createEnemyMesh(enemy: EnemyEntity): THREE.Group {
    const root = new THREE.Group();
    root.name = `enemy_${enemy.id}`;

    if (enemy.isBoss) {
      root.add(this.createBossMesh());
      root.scale.set(1.5, 1.5, 1.5);
    } else if (enemy.typeId === 'charging' || enemy.typeId === 'war_dog' || enemy.typeId === 'light_cavalry') {
      root.add(this.createChargingMesh());
      root.scale.set(1.1, 1.1, 1.1);
    } else if (enemy.armor > 20 || enemy.typeId === 'shield_guard' || enemy.typeId === 'iron_pagoda') {
      root.add(this.createHeavyMesh());
      root.scale.set(1.25, 1.25, 1.25);
    } else {
      root.add(this.createOrdinaryMesh());
      root.scale.set(1.0, 1.0, 1.0);
    }

    // Facing direction: marching upwards (-Z or +Y in screen space)
    root.rotation.x = THREE.MathUtils.degToRad(-35);
    root.rotation.y = THREE.MathUtils.degToRad(180);

    return root;
  }

  /**
   * 1. Ordinary (Light Infantry 流寇轻步兵)
   */
  private static createOrdinaryMesh(): THREE.Group {
    const group = new THREE.Group();

    // Body / Torso
    const torsoGeo = new THREE.CylinderGeometry(3.5, 4.2, 10, 8);
    const torso = new THREE.Mesh(torsoGeo, this.clothArmorMaterial);
    torso.position.set(0, 10, 0);
    torso.castShadow = true;
    group.add(torso);

    // Head & Red Turban
    const headGeo = new THREE.SphereGeometry(3.0, 8, 8);
    const head = new THREE.Mesh(headGeo, this.skinMaterial);
    head.position.set(0, 17, 0);
    group.add(head);

    const turbanGeo = new THREE.TorusGeometry(3.2, 1.0, 8, 16);
    turbanGeo.rotateX(Math.PI / 2);
    const turban = new THREE.Mesh(turbanGeo, this.redTurbanMaterial);
    turban.position.set(0, 18, 0);
    group.add(turban);

    // Spear
    const shaftGeo = new THREE.CylinderGeometry(0.5, 0.5, 26, 6);
    const shaft = new THREE.Mesh(shaftGeo, this.clothArmorMaterial);
    shaft.position.set(5, 13, 3);
    shaft.rotation.x = THREE.MathUtils.degToRad(20);
    group.add(shaft);

    const tipGeo = new THREE.ConeGeometry(1.2, 5, 4);
    const tip = new THREE.Mesh(tipGeo, this.heavyIronMaterial);
    tip.position.set(5, 26, 7.5);
    tip.rotation.x = THREE.MathUtils.degToRad(20);
    group.add(tip);

    // Legs
    for (const legX of [-2, 2]) {
      const legGeo = new THREE.CylinderGeometry(1.2, 1.0, 8, 6);
      const leg = new THREE.Mesh(legGeo, this.clothArmorMaterial);
      leg.position.set(legX, 4, 0);
      group.add(leg);
    }

    return group;
  }

  /**
   * 2. Charging (War Dog / Cavalry 狂暴战犬 / 轻骑兵)
   */
  private static createChargingMesh(): THREE.Group {
    const group = new THREE.Group();

    // Hound Body
    const bodyGeo = new THREE.BoxGeometry(6, 6, 14);
    const body = new THREE.Mesh(bodyGeo, this.demonicFurMaterial);
    body.position.set(0, 6, 0);
    body.castShadow = true;
    group.add(body);

    // Hound Head with spiked iron collar
    const headGeo = new THREE.ConeGeometry(3.5, 8, 6);
    headGeo.rotateX(Math.PI / 2);
    const head = new THREE.Mesh(headGeo, this.demonicFurMaterial);
    head.position.set(0, 8, 8);
    group.add(head);

    // Glowing Crimson Eyes
    for (const eyeX of [-1.5, 1.5]) {
      const eyeGeo = new THREE.SphereGeometry(0.6, 6, 6);
      const eye = new THREE.Mesh(eyeGeo, this.demonicEyeMaterial);
      eye.position.set(eyeX, 9.2, 10.5);
      group.add(eye);
    }

    // 4 Running Legs
    for (const legX of [-2.8, 2.8]) {
      for (const legZ of [-4, 4]) {
        const legGeo = new THREE.CylinderGeometry(1.0, 0.7, 7, 6);
        const leg = new THREE.Mesh(legGeo, this.demonicFurMaterial);
        leg.position.set(legX, 3.5, legZ);
        group.add(leg);
      }
    }

    return group;
  }

  /**
   * 3. Heavy (Shield Guard / Iron Pagoda 重甲铁浮屠)
   */
  private static createHeavyMesh(): THREE.Group {
    const group = new THREE.Group();

    // Heavy Iron Plate Torso
    const torsoGeo = new THREE.BoxGeometry(9, 11, 7);
    const torso = new THREE.Mesh(torsoGeo, this.heavyIronMaterial);
    torso.position.set(0, 11, 0);
    torso.castShadow = true;
    group.add(torso);

    // Iron Helmet with Golden Crest
    const helmGeo = new THREE.CylinderGeometry(3.6, 4.0, 6, 8);
    const helm = new THREE.Mesh(helmGeo, this.heavyIronMaterial);
    helm.position.set(0, 19, 0);
    group.add(helm);

    const crestGeo = new THREE.ConeGeometry(1.2, 5, 4);
    const crest = new THREE.Mesh(crestGeo, this.goldTrimMaterial);
    crest.position.set(0, 23, 0);
    group.add(crest);

    // Tower Shield (正面重盾)
    const shieldGeo = new THREE.BoxGeometry(10, 16, 2);
    const shield = new THREE.Mesh(shieldGeo, this.heavyIronMaterial);
    shield.position.set(0, 10, 6);
    shield.castShadow = true;
    group.add(shield);

    // Shield Emblem (Gold Boss)
    const bossGeo = new THREE.CylinderGeometry(2.5, 2.5, 1.2, 8);
    bossGeo.rotateX(Math.PI / 2);
    const boss = new THREE.Mesh(bossGeo, this.goldTrimMaterial);
    boss.position.set(0, 11, 7.5);
    group.add(boss);

    // Heavy Mace Weapon
    const maceGeo = new THREE.CylinderGeometry(0.8, 0.8, 18, 6);
    const mace = new THREE.Mesh(maceGeo, this.heavyIronMaterial);
    mace.position.set(7, 12, 0);
    group.add(mace);

    return group;
  }

  /**
   * 4. Boss (Boss Bear / Demonic General 巨型暴熊 / 妖化统领)
   */
  private static createBossMesh(): THREE.Group {
    const group = new THREE.Group();

    // Giant Demonic Torso with Spikes
    const torsoGeo = new THREE.SphereGeometry(9, 10, 10);
    torsoGeo.scale(1.0, 1.3, 0.9);
    const torso = new THREE.Mesh(torsoGeo, this.demonicFurMaterial);
    torso.position.set(0, 15, 0);
    torso.castShadow = true;
    group.add(torso);

    // Giant Beast Head with Horns
    const headGeo = new THREE.SphereGeometry(6, 8, 8);
    const head = new THREE.Mesh(headGeo, this.demonicFurMaterial);
    head.position.set(0, 26, 4);
    group.add(head);

    // Glowing Demonic Eyes
    for (const eyeX of [-2.2, 2.2]) {
      const eyeGeo = new THREE.SphereGeometry(1.2, 8, 8);
      const eye = new THREE.Mesh(eyeGeo, this.demonicEyeMaterial);
      eye.position.set(eyeX, 27.5, 9.2);
      group.add(eye);
    }

    // Spiked Shoulder Bracers
    for (const armX of [-10, 10]) {
      const padGeo = new THREE.ConeGeometry(4, 8, 6);
      padGeo.rotateZ(armX > 0 ? -Math.PI / 3 : Math.PI / 3);
      const pad = new THREE.Mesh(padGeo, this.goldTrimMaterial);
      pad.position.set(armX, 22, 0);
      group.add(pad);
    }

    return group;
  }
}
