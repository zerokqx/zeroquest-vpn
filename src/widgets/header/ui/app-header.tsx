import {
  Button,
  Container,
  Group,
  Text,
} from "@mantine/core";
import Link from "next/link";
import { Suspense } from "react";
import { ColorSchemeToggle } from "@/features/theme/ui/color-scheme-toggle";
import { MobileHeaderMenu } from "./mobile-header-menu";
import { HeaderAuthSection } from "./header-auth-section";
import styles from "./app-header.module.css";

function HeaderActionsFallback() {
  return (
    <>
      <Group
        className={styles.actions}
        gap="sm"
        visibleFrom="md"
        wrap="nowrap"
      >
        <ColorSchemeToggle />
        <Group gap="sm">
          <Link href="/auth">
            <Button component="span" variant="light">
              Войти
            </Button>
          </Link>
          <Link href="/auth?mode=register">
            <Button component="span">Регистрация</Button>
          </Link>
        </Group>
      </Group>

      <Group className={styles.mobileOnly} hiddenFrom="md">
        <MobileHeaderMenu user={null} />
      </Group>
    </>
  );
}

export function AppHeader() {
  return (
    <header className={styles.wrap}>
      <Container size="xl">
        <Group className={styles.bar} justify="space-between" wrap="nowrap">
          <Group className={styles.primaryRow} gap="lg" wrap="nowrap">
            <Link className={styles.brandLink} href="/">
              <Group
                style={{
                  opacity: 0.6,
                }}
                gap="sm"
                wrap="nowrap"
              >
                <Text span aria-hidden="true" className={styles.brandMark}>
                  ZQ
                </Text>
                <Text fw={700} className={styles.brandName}>
                  ZeroQuest
                </Text>
              </Group>
            </Link>

            <nav
              aria-label="Основная навигация"
              className={styles.navList}
            >
              <Group gap="md" visibleFrom="md" wrap="nowrap">
                <Link className={styles.navLink} href="/">
                  Главная
                </Link>
                <Link className={styles.navLink} href="/instructions">
                  Инструкция
                </Link>
              </Group>
            </nav>
          </Group>

          <Suspense fallback={<HeaderActionsFallback />}>
            <HeaderAuthSection />
          </Suspense>
        </Group>
      </Container>
    </header>
  );
}
