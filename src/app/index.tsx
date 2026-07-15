import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const GROUND_HEIGHT = 90;
const PLAYER_SIZE = 56;
const PLAYER_LEFT = 80;
const OBSTACLE_WIDTH = 46;
const OBSTACLE_HEIGHT = 64;

const GRAVITY = 1;
const JUMP_FORCE = -18;
const FRAME_TIME = 16;
const OBSTACLE_SPEED = 5;
const SPAWN_CHANCE = 0.025;
const STORAGE_KEY = "endless_runner_high_score";
const MAX_JUMPS = 3;

type Obstacle = {
  id: number;
  x: number;
};

type PhysicsState = {
  y: number;
  velocity: number;
  jumping: boolean;
  jumpsLeft: number;
};

export default function HomeScreen() {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const physicsRef = useRef<PhysicsState>({
    y: 0,
    velocity: 0,
    jumping: false,
    jumpsLeft: MAX_JUMPS,
  });

  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerFloat = useRef(new Animated.Value(0)).current;
  const obstacleWobble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) setHighScore(Number(value));
    });
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(playerFloat, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(playerFloat, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [playerFloat]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(obstacleWobble, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(obstacleWobble, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [obstacleWobble]);

  useEffect(() => {
    if (!gameStarted || isGameOver) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      return;
    }

    gameLoopRef.current = setInterval(() => {
      const physics = physicsRef.current;

      if (physics.jumping) {
        physics.velocity += GRAVITY;
        physics.y += physics.velocity;

        if (physics.y >= 0) {
          physics.y = 0;
          physics.velocity = 0;
          physics.jumping = false;
          physics.jumpsLeft = MAX_JUMPS;
        }
      }

      setPlayerY(physics.y);

      setObstacles((currentObstacles) => {
        const moved = currentObstacles
          .map((obstacle) => ({
            ...obstacle,
            x: obstacle.x - OBSTACLE_SPEED,
          }))
          .filter((obstacle) => obstacle.x > -OBSTACLE_WIDTH);

        if (Math.random() < SPAWN_CHANCE) {
          moved.push({
            id: Date.now() + Math.random(),
            x: SCREEN_WIDTH + 20,
          });
        }

        const playerLeft = PLAYER_LEFT;
        const playerRight = playerLeft + PLAYER_SIZE;
        const playerTop = SCREEN_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE - physics.y;
        const playerBottom = playerTop + PLAYER_SIZE;

        const hit = moved.some((obstacle) => {
          const obstacleLeft = obstacle.x;
          const obstacleRight = obstacle.x + OBSTACLE_WIDTH;
          const obstacleBottom = SCREEN_HEIGHT - GROUND_HEIGHT;
          const obstacleTop = obstacleBottom - OBSTACLE_HEIGHT;

          const horizontalOverlap =
            playerLeft < obstacleRight && playerRight > obstacleLeft;

          const verticalOverlap =
            playerTop < obstacleBottom && playerBottom > obstacleTop;

          return horizontalOverlap && verticalOverlap;
        });

        if (hit) {
          setIsGameOver(true);
        }

        return moved;
      });

      setScore((prev) => prev + 1);
    }, FRAME_TIME);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameStarted, isGameOver]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      AsyncStorage.setItem(STORAGE_KEY, String(score));
    }
  }, [score, highScore]);

  const jump = () => {
    const physics = physicsRef.current;
    if (isGameOver) return;
    if (physics.jumpsLeft <= 0) return;

    physics.velocity = JUMP_FORCE;
    physics.jumping = true;
    physics.jumpsLeft -= 1;
  };

  const startGame = () => {
    physicsRef.current = {
      y: 0,
      velocity: 0,
      jumping: false,
      jumpsLeft: MAX_JUMPS,
    };
    setPlayerY(0);
    setObstacles([]);
    setScore(0);
    setIsGameOver(false);
    setGameStarted(true);
  };

  const restartGame = () => {
    physicsRef.current = {
      y: 0,
      velocity: 0,
      jumping: false,
      jumpsLeft: MAX_JUMPS,
    };
    setPlayerY(0);
    setObstacles([]);
    setScore(0);
    setIsGameOver(false);
  };

  const playerTranslateY = playerFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });

  if (!gameStarted) {
    return (
      <LinearGradient
        colors={["#0F172A", "#111827", "#1F2937"]}
        style={styles.container}
      >
        <View style={styles.centerScreen}>
          <View style={styles.card}>
            <Text style={styles.gameOverTitle}>Endless Runner</Text>
            <Text style={styles.finalScore}>Tap Start to play</Text>

            <TouchableOpacity style={styles.restartButton} onPress={startGame}>
              <Text style={styles.buttonText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (isGameOver) {
    return (
      <LinearGradient
        colors={["#0F172A", "#111827", "#1F2937"]}
        style={styles.container}
      >
        <View style={styles.centerScreen}>
          <View style={styles.card}>
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.finalScore}>Final Score: {score}</Text>
            <Text style={styles.highScore}>High Score: {highScore}</Text>

            <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
              <Text style={styles.buttonText}>Restart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#0F172A", "#111827", "#1E293B", "#0B1020"]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Endless Runner</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>Score: {score}</Text>
          <Text style={styles.score}>High: {highScore}</Text>
        </View>
      </View>

      <View style={styles.gameArea}>
        <Animated.View
          style={[
            styles.playerShadow,
            {
              transform: [{ translateY: playerTranslateY }],
              bottom: GROUND_HEIGHT - playerY - 2,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.player,
            {
              transform: [{ translateY: playerTranslateY }],
              bottom: GROUND_HEIGHT - playerY,
            },
          ]}
        >
          <View style={styles.playerFace} />
          <View style={styles.playerHighlight} />
        </Animated.View>

        {obstacles.map((obstacle) => (
          <Animated.View
            key={obstacle.id}
            style={[
              styles.obstacleShadow,
              {
                left: obstacle.x + 3,
                bottom: GROUND_HEIGHT - 3,
              },
            ]}
          >
            <View style={styles.obstacleInner} />
          </Animated.View>
        ))}

        {obstacles.map((obstacle) => (
          <Animated.View
            key={`obs-${obstacle.id}`}
            style={[
              styles.obstacle,
              {
                left: obstacle.x,
                bottom: GROUND_HEIGHT,
              },
            ]}
          >
            <View style={styles.obstacleStripe} />
          </Animated.View>
        ))}

        <View style={styles.ground} />
      </View>

      <TouchableOpacity style={styles.jumpButton} onPress={jump}>
        <Text style={styles.buttonText}>Jump</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
  },
  scoreRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  score: {
    color: "#D1D5DB",
    fontSize: 18,
    fontWeight: "600",
  },
  gameArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  player: {
    position: "absolute",
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    left: PLAYER_LEFT,
    borderRadius: 18,
    backgroundColor: "#60A5FA",
    borderWidth: 2,
    borderColor: "#DBEAFE",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  playerShadow: {
    position: "absolute",
    width: PLAYER_SIZE,
    height: 12,
    left: PLAYER_LEFT + 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.25)",
    opacity: 0.8,
  },
  playerFace: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1E3A8A",
    alignSelf: "flex-start",
    marginLeft: 12,
    marginBottom: 8,
  },
  playerHighlight: {
    position: "absolute",
    top: 8,
    left: 10,
    width: 18,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  obstacle: {
    position: "absolute",
    width: OBSTACLE_WIDTH,
    height: OBSTACLE_HEIGHT,
    borderRadius: 14,
    backgroundColor: "#F87171",
    borderWidth: 2,
    borderColor: "#FECACA",
    shadowColor: "#F87171",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    overflow: "hidden",
  },
  obstacleStripe: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(127,29,29,0.25)",
    transform: [{ skewY: "-12deg" }],
  },
  obstacleShadow: {
    position: "absolute",
    width: OBSTACLE_WIDTH,
    height: OBSTACLE_HEIGHT,
  },
  obstacleInner: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  ground: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: GROUND_HEIGHT,
    backgroundColor: "#334155",
    borderTopWidth: 2,
    borderTopColor: "#64748B",
  },
  jumpButton: {
    backgroundColor: "#22C55E",
    margin: 20,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  gameOverTitle: {
    color: "white",
    fontSize: 36,
    fontWeight: "bold",
  },
  finalScore: {
    color: "#E5E7EB",
    fontSize: 22,
    marginTop: 12,
  },
  highScore: {
    color: "#93C5FD",
    fontSize: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  restartButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 20,
  },
});