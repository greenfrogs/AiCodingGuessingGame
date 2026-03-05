import { useState } from "react";
import {
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
  Title
} from "@mantine/core";
import { IconArrowRight, IconCode, IconGitCompare } from "@tabler/icons-react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import snippetsByChallenge from "../data/snippets.json";

const styleHints = {
  Claude: "Often strongly structured and polished.",
  GPT: "Usually edge-case heavy with generalized internals.",
  Gemini: "Commonly direct and explanatory in naming flow.",
  Composer: "Tends to be concise and pragmatic."
};

const agents = ["Claude", "GPT", "Gemini", "Composer"];
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
  const [message, setMessage] = useState("Pick who wrote the LEFT snippet.");

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
      setMessage(
        `Correct. LEFT is ${current.leftAuthor}; RIGHT is ${current.rightAuthor}. Hint for ${current.leftAuthor}: ${styleHints[current.leftAuthor]}`
      );
    } else {
      setStreak(0);
      setMessage(
        `Not quite. LEFT is ${current.leftAuthor}; RIGHT is ${current.rightAuthor}. Hint for ${current.leftAuthor}: ${styleHints[current.leftAuthor]} | Hint for ${current.rightAuthor}: ${styleHints[current.rightAuthor]}`
      );
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
      setMessage(`Final score: ${score}/${total} (${finalPct}%). Title: ${rank}.`);
    } else {
      setIndex(next);
      setLocked(false);
      setMessage("Pick who wrote the LEFT snippet.");
    }
  }

  function resetGame() {
    setRounds(buildRounds());
    setIndex(0);
    setScore(0);
    setStreak(0);
    setLocked(false);
    setMessage("Pick who wrote the LEFT snippet.");
  }

  if (done) {
    return (
      <Container size={1200} py="xl">
        <Card withBorder p="xl" radius="lg" className="shell-card">
          <Stack align="center" gap="md">
            <Group gap="xs">
              <IconCode size={22} />
              <Title order={2}>AI Code Guessing Game</Title>
            </Group>
            <Text c="dimmed">{message}</Text>
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
                {name}
              </Button>
            ))}
          </SimpleGrid>

          <Card withBorder radius="md" p="sm">
            <Group justify="space-between" align="center" wrap="wrap">
              <Text size="sm">{message}</Text>
              <Button
                disabled={!locked}
                onClick={handleNext}
                rightSection={<IconArrowRight size={16} />}
              >
                Next Matchup
              </Button>
            </Group>
          </Card>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder radius="md" p={0} className="editor-card">
                <Group justify="space-between" px="sm" py={8} className="editor-header">
                  <Text fw={600}>Left Snippet</Text>
                  {locked ? (
                    <Badge size="sm" color="indigo" variant="light">{current.leftAuthor}</Badge>
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
                    <Badge size="sm" color="teal" variant="light">{current.rightAuthor}</Badge>
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
