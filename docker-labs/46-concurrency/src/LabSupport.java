import java.util.concurrent.*;
import java.util.function.BooleanSupplier;

final class LabSupport {
    static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    static void await(CountDownLatch latch) throws InterruptedException {
        require(latch.await(3, TimeUnit.SECONDS), "Latch deadline exceeded");
    }

    static void join(Thread thread) throws InterruptedException {
        thread.join(3000);
        require(!thread.isAlive(), "Thread did not finish: " + thread.getName());
    }

    static void until(BooleanSupplier condition, String message) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
        while (!condition.getAsBoolean()) {
            require(System.nanoTime() < deadline, message);
            Thread.sleep(1);
        }
    }
}
