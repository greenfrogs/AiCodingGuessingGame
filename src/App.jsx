import { useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title
} from "@mantine/core";
import {
  IconArrowRight,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconCode,
  IconGitCompare,
  IconTrophy
} from "@tabler/icons-react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import snippetsByChallenge from "../data/snippets.json";

const styleHints = {
  GPT53CodexHigh: "Usually edge-case heavy with generalized internals.",
  Claude46OpusHigh: "Often strongly structured and polished.",
  Gemini31ProThinking: "Commonly direct and explanatory in naming flow.",
  Gemini3FlashThinking: "Tends to be concise and pragmatic."
};

const modelDisplayName = {
  GPT53CodexHigh: "GPT 5.3 Codex (high thinking)",
  Claude46OpusHigh: "Claude 4.6 Opus (high thinking)",
  Gemini31ProThinking: "Gemini 3.1 Pro (thinking)",
  Gemini3FlashThinking: "Gemini 3 Flash (thinking)"
};

const agents = [
  "GPT53CodexHigh",
  "Claude46OpusHigh",
  "Gemini31ProThinking",
  "Gemini3FlashThinking"
];
const CHALLENGES_PER_GAME = 5;

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function monacoLanguage(language) {
  const map = {
    javascript: "javascript",
    typescript: "typescript",
    python: "python",
    rust: "rust"
  };
  return map[language] || "plaintext";
}

function buildRounds() {
  const rounds = [];
  const selected = shuffle(snippetsByChallenge).slice(
    0,
    Math.min(CHALLENGES_PER_GAME, snippetsByChallenge.length)
  );

  for (const challenge of selected) {
    const [a, b] = shuffle(agents).slice(0, 2);
    const [left, right] = Math.random() < 0.5 ? [a, b] : [b, a];
    rounds.push({
      challengeLabel: challenge.label,
      language: challenge.language,
      leftAuthor: left,
      rightAuthor: right,
      leftCode: challenge.answers[left],
      rightCode: challenge.answers[right]
    });
  }
  return rounds;
}

export default function App() {
  const [rounds, setRounds] = useState(() => buildRounds());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState({
    tone: "neutral",
    title: "Ready",
    message: "Pick who wrote the LEFT snippet."
  });

  const current = rounds[index];
  const total = rounds.length;
  const done = index >= total;
  const progress = done ? 100 : (index / total) * 100;
  const language = current ? monacoLanguage(current.language) : "plaintext";

  function handleGuess(name) {
    if (locked || done) return;
    const correct = name === current.leftAuthor;
    setLocked(true);
    if (correct) {
      setScore((v) => v + 1);
      setStreak((v) => v + 1);
      setFeedback({
        tone: "correct",
        title: "Correct",
        message:
          `LEFT: ${modelDisplayName[current.leftAuthor]} | RIGHT: ${modelDisplayName[current.rightAuthor]}. ` +
          `Hint for ${modelDisplayName[current.leftAuthor]}: ${styleHints[current.leftAuthor]}`
      });
    } else {
      setStreak(0);
      setFeedback({
        tone: "wrong",
        title: "Not quite",
        message:
          `LEFT: ${modelDisplayName[current.leftAuthor]} | RIGHT: ${modelDisplayName[current.rightAuthor]}. ` +
          `Hint for ${modelDisplayName[current.leftAuthor]}: ${styleHints[current.leftAuthor]} | ` +
          `Hint for ${modelDisplayName[current.rightAuthor]}: ${styleHints[current.rightAuthor]}`
      });
    }
  }

  function handleNext() {
    if (done) return;
    const next = index + 1;
    if (next >= total) {
      const finalPct = Math.round((score / total) * 100);
      let rank = "Getting Warm";
      if (finalPct === 100) rank = "AI Whisperer";
      else if (finalPct >= 80) rank = "Model Sleuth";
      else if (finalPct >= 60) rank = "Prompt Detective";
      setIndex(total);
      setLocked(true);
      setFeedback({
        tone: "final",
        title: `Final Result: ${rank}`,
        message: `You scored ${score}/${total} (${finalPct}%).`
      });
    } else {
      setIndex(next);
      setLocked(false);
      setFeedback({
        tone: "neutral",
        title: "Next Round",
        message: "Pick who wrote the LEFT snippet."
      });
    }
  }

  function resetGame() {
    setRounds(buildRounds());
    setIndex(0);
    setScore(0);
    setStreak(0);
    setLocked(false);
    setFeedback({
      tone: "neutral",
      title: "Ready",
      message: "Pick who wrote the LEFT snippet."
    });
  }

  if (done) {
    const pct = Math.round((score / total) * 100);
    let rank = "Getting Warm";
    if (pct === 100) rank = "AI Whisperer";
    else if (pct >= 80) rank = "Model Sleuth";
    else if (pct >= 60) rank = "Prompt Detective";
    return (
      <Container size={1200} py="xl">
        <Card withBorder p="xl" radius="lg" className="shell-card">
          <Stack align="center" gap="lg">
            <ThemeIcon size={56} radius="xl" variant="light" color="yellow">
              <IconTrophy size={30} />
            </ThemeIcon>
            <Group gap="xs" justify="center">
              <Title order={2}>Game Complete</Title>
            </Group>
            <Badge size="lg" color="grape" variant="light">{rank}</Badge>
            <Group gap="sm">
              <Badge size="xl" variant="light" color="cyan">{`Score ${score}/${total}`}</Badge>
              <Badge size="xl" variant="light" color="teal">{`Accuracy ${pct}%`}</Badge>
            </Group>
            <Text c="dimmed" ta="center">
              Nice run. You can replay with a new random set of 5 challenges.
            </Text>
            <Button onClick={resetGame} size="md" rightSection={<IconArrowRight size={16} />}>
              Play Again
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size={1280} py="md">
      <Card withBorder p="md" radius="lg" className="shell-card">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <IconCode size={24} />
              <Title order={2}>AI Code Guessing Game</Title>
            </Group>
            <Group gap="xs">
              <Badge size="lg" variant="light">{`Round ${index + 1}/${total}`}</Badge>
              <Badge size="lg" variant="light" color="cyan">{`Score ${score}`}</Badge>
              <Badge size="lg" variant="light" color="grape">{`Streak ${streak}`}</Badge>
            </Group>
          </Group>

          <Progress value={progress} radius="xl" size="sm" />
          <Text c="dimmed">
            {`${current.challengeLabel} (${current.language}). Pick who wrote the LEFT snippet.`}
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {[current.leftAuthor, current.rightAuthor].map((name) => (
              <Button
                key={name}
                size="md"
                variant="light"
                disabled={locked}
                onClick={() => handleGuess(name)}
              >
                {modelDisplayName[name]}
              </Button>
            ))}
          </SimpleGrid>

          <Card withBorder radius="md" p="sm" className="feedback-card">
            <Box className="feedback-inline-row">
              <Group gap="xs" align="center" className="feedback-copy">
                {feedback.tone === "correct" && <IconCircleCheckFilled size={18} color="#40c057" />}
                {feedback.tone === "wrong" && <IconCircleXFilled size={18} color="#fa5252" />}
                <div>
                  <Text fw={700} size="sm">
                    {feedback.title}
                  </Text>
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {feedback.message}
                  </Text>
                </div>
              </Group>
              <Button
                className="feedback-next-btn"
                disabled={!locked}
                onClick={handleNext}
                rightSection={<IconArrowRight size={16} />}
              >
                Next Matchup
              </Button>
            </Box>
          </Card>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder radius="md" p={0} className="editor-card">
                <Group justify="space-between" px="sm" py={8} className="editor-header">
                  <Text fw={600}>Left Snippet</Text>
                  {locked ? (
                    <Badge size="sm" color="indigo" variant="light">{modelDisplayName[current.leftAuthor]}</Badge>
                  ) : (
                    <Badge size="sm" color="gray" variant="light">Hidden</Badge>
                  )}
                </Group>
                <Editor
                  height="320px"
                  theme="vs-dark"
                  language={language}
                  value={current.leftCode}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    lineNumbersMinChars: 3,
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    wordWrap: "on"
                  }}
                />
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder radius="md" p={0} className="editor-card">
                <Group justify="space-between" px="sm" py={8} className="editor-header">
                  <Text fw={600}>Right Snippet</Text>
                  {locked ? (
                    <Badge size="sm" color="teal" variant="light">{modelDisplayName[current.rightAuthor]}</Badge>
                  ) : (
                    <Badge size="sm" color="gray" variant="light">Hidden</Badge>
                  )}
                </Group>
                <Editor
                  height="320px"
                  theme="vs-dark"
                  language={language}
                  value={current.rightCode}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    lineNumbersMinChars: 3,
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    wordWrap: "on"
                  }}
                />
              </Card>
            </Grid.Col>
          </Grid>

          <Card withBorder radius="md" p={0} className="editor-card">
            <Group justify="space-between" px="sm" py={8} className="editor-header">
              <Group gap={6}>
                <IconGitCompare size={16} />
                <Text fw={600}>Git-style Diff (Left → Right)</Text>
              </Group>
            </Group>
            <Box className="diff-container">
              <DiffEditor
                height="360px"
                theme="vs-dark"
                language={language}
                original={current.leftCode}
                modified={current.rightCode}
                options={{
                  readOnly: true,
                  renderSideBySide: false,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  wordWrap: "on"
                }}
              />
            </Box>
          </Card>
        </Stack>
      </Card>
    </Container>
  );
}
