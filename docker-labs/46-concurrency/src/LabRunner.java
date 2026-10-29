public final class LabRunner {
    public static void main(String[] args) throws Exception {
        if (args.length != 1) throw new IllegalArgumentException("Exactly one exercise required");
        switch (args[0]) {
            case "ex0-basics" -> BasicsLab.run();
            case "ex1-race" -> RaceLab.run();
            case "ex2-queue" -> QueueLab.run();
            case "ex3-pool" -> PoolLab.run();
            case "ex4-deadlock" -> DeadlockLab.run();
            case "ex5-workers" -> WorkersLab.run();
            case "child-memory" -> System.out.println("separate JVM field=" + BasicsLab.shared);
            case "test" -> LabTests.run();
            default -> throw new IllegalArgumentException("Unknown exercise: " + args[0]);
        }
    }
}
