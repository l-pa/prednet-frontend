import { Box, Button, Container, HStack, Link, Stack, Text } from "@chakra-ui/react"
import { Link as RouterLink } from "@tanstack/react-router"
import { createFileRoute } from "@tanstack/react-router"

import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  return (
    <Container maxW="full">
      <Box pt={12} m={4}>
        <Text fontSize="2xl" truncate maxW="sm">
          Hi, {currentUser?.full_name || currentUser?.email} 👋🏼
        </Text>
        <Text>Explore networks and proteins below.</Text>
      </Box>

      <Box m={4}>
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          Quick links
        </Text>
        <Stack direction={{ base: "column", md: "row" }} gap={4}>
          <RouterLink to="/networks">
            <Button colorScheme="blue">Browse Networks</Button>
          </RouterLink>
          <RouterLink to="/proteins">
            <Button colorScheme="teal">Browse Proteins</Button>
          </RouterLink>
        </Stack>
      </Box>

      <Box m={4}>
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          External protein databases
        </Text>
        <HStack gap={3} flexWrap="wrap">
          <Link href="https://thebiogrid.org/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">BioGRID</Button>
          </Link>
          <Link href="https://www.uniprot.org/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">UniProt</Button>
          </Link>
          <Link href="https://string-db.org/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">STRING-DB</Button>
          </Link>
          <Link href="https://www.yeastgenome.org/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">SGD</Button>
          </Link>
        </HStack>
      </Box>
    </Container>
  )
}
