FROM eclipse-temurin:21-jdk
WORKDIR /lab
COPY src ./src
RUN javac --release 21 -d classes src/*.java
ENTRYPOINT ["java", "-cp", "classes", "LabRunner"]
CMD ["ex0-basics"]
