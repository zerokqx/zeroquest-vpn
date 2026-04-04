import {
  Avatar,
  Button,
  Container,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import Link from "next/link";
import { getCurrentUser } from "@/entities/user";
import { LogoutButton } from "@/features/auth/ui/logout-button";
import { ColorSchemeToggle } from "@/features/theme/ui/color-scheme-toggle";
import { MobileHeaderMenu } from "./mobile-header-menu";
import styles from "./app-header.module.css";

const toInitials = (login: string): string =>
  login
    .split(/[\W_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || login.slice(0, 2).toUpperCase();

export async function AppHeader() {
  const user = await getCurrentUser();

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
                {user ? (
                  <Link className={styles.navLink} href="/dashboard">
                    Dashboard
                  </Link>
                ) : null}
                {user?.role === "admin" ? (
                  <Link className={styles.navLink} href="/admin">
                    Admin
                  </Link>
                ) : null}
              </Group>
            </nav>
          </Group>

          <Group
            className={styles.actions}
            gap="sm"
            visibleFrom="md"
            wrap="nowrap"
          >
            <ColorSchemeToggle />
            {user ? (
              <Group gap="sm" wrap="nowrap">
                <Group className={styles.identity} gap="sm" wrap="nowrap">
                  <Avatar color="accent" radius="xl" size={38}>
                    {toInitials(user.login)}
                  </Avatar>
                  <Stack gap={1}>
                    <span className={styles.identityName}>{user.login}</span>
                    <span className={styles.identityCopy}>
                      {user.role === "admin"
                        ? "Администратор"
                        : "Аккаунт активен"}
                    </span>
                  </Stack>
                </Group>
                <LogoutButton />
              </Group>
            ) : (
              <Group gap="sm">
                <Button component="a" href="/auth" variant="light">
                  Войти
                </Button>
                <Button component="a" href="/auth?mode=register">
                  Регистрация
                </Button>
              </Group>
            )}
          </Group>

          <Group className={styles.mobileOnly} hiddenFrom="md">
            <MobileHeaderMenu
              user={user ? { login: user.login, role: user.role } : null}
            />
          </Group>
        </Group>
      </Container>
    </header>
  );
}
